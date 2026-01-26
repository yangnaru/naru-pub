use anyhow::Result;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::Credentials;
use bytes::Bytes;
use http_body_util::Full;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;
use percent_encoding::percent_decode_str;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::net::IpAddr;
use std::sync::Arc;
use ipnetwork::IpNetwork;

// Configuration struct
struct Config {
    bucket_name: String,
    account_id: String,
    access_key_id: String,
    secret_access_key: String,
    port: u16,
    database_url: String,
}

// Shared state for the application
struct AppState {
    s3_client: S3Client,
    bucket_name: String,
    db_pool: PgPool,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize configuration
    let config = Config {
        bucket_name: std::env::var("R2_BUCKET_NAME").expect("R2_BUCKET_NAME must be set"),
        account_id: std::env::var("R2_ACCOUNT_ID").expect("R2_ACCOUNT_ID must be set"),
        access_key_id: std::env::var("AWS_ACCESS_KEY_ID").expect("AWS_ACCESS_KEY_ID must be set"),
        secret_access_key: std::env::var("AWS_SECRET_ACCESS_KEY").expect("AWS_SECRET_ACCESS_KEY must be set"),
        port: std::env::var("PORT")
            .unwrap_or_else(|_| "5000".to_string())
            .parse()
            .expect("PORT must be a valid number"),
        database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
    };

    // Initialize R2 client
    let r2_endpoint = format!("https://{}.r2.cloudflarestorage.com", config.account_id);
    let aws_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .endpoint_url(r2_endpoint)
        .region(aws_sdk_s3::config::Region::new("auto"))
        .credentials_provider(Credentials::new(
            config.access_key_id,
            config.secret_access_key,
            None,
            None,
            "R2",
        ))
        .load()
        .await;
    let s3_client = S3Client::new(&aws_config);

    // Initialize database connection pool
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");
    println!("Connected to database");

    // Create shared application state
    let app_state = Arc::new(AppState {
        s3_client,
        bucket_name: config.bucket_name,
        db_pool,
    });

    // Create a TCP listener
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = TcpListener::bind(&addr).await?;
    println!("Server running on http://{}", addr);

    // Handle incoming connections
    loop {
        let (stream, socket_addr) = listener.accept().await?;
        let io = TokioIo::new(stream);
        let state = app_state.clone();
        let client_ip = socket_addr.ip();

        // Spawn a new task for each connection
        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(
                    io,
                    service_fn(move |req| handle_request(req, state.clone(), client_ip)),
                )
                .await
            {
                eprintln!("Error serving connection: {}", err);
            }
        });
    }
}

// Extract client IP from X-Forwarded-For header or socket address
fn get_client_ip(req: &Request<hyper::body::Incoming>, socket_ip: IpAddr) -> IpAddr {
    req.headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(socket_ip)
}

// Record a pageview in the database (fire-and-forget)
fn record_pageview(db_pool: PgPool, subdomain: String, path: String, client_ip: IpAddr) {
    tokio::spawn(async move {
        // Look up user_id from login_name (subdomain)
        let user_result: Result<Option<(i32,)>, _> = sqlx::query_as(
            "SELECT id FROM users WHERE login_name = $1"
        )
        .bind(&subdomain)
        .fetch_optional(&db_pool)
        .await;

        if let Ok(Some((user_id,))) = user_result {
            // Convert IpAddr to IpNetwork for PostgreSQL inet type
            let ip_network = IpNetwork::from(client_ip);

            // Insert pageview record
            let insert_result = sqlx::query(
                "INSERT INTO pageviews (user_id, path, ip) VALUES ($1, $2, $3)"
            )
            .bind(user_id)
            .bind(&path)
            .bind(ip_network)
            .execute(&db_pool)
            .await;

            if let Err(e) = insert_result {
                eprintln!("Error recording pageview: {}", e);
            }
        }
    });
}

// Handle individual HTTP requests
async fn handle_request(
    req: Request<hyper::body::Incoming>,
    state: Arc<AppState>,
    socket_ip: IpAddr,
) -> Result<Response<Full<Bytes>>> {
    // Get client IP from headers or socket
    let client_ip = get_client_ip(&req, socket_ip);

    // Extract the host from the request headers, with better error handling
    let host = req
        .headers()
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or_default()
        .to_string();

    // More robust subdomain extraction
    let subdomain = host
        .split('.')
        .next()
        .filter(|&s| !s.is_empty())
        .unwrap_or_default()
        .to_string();

    let raw_path = req.uri().path().trim_start_matches('/');
    // URL decode the path
    let raw_path = percent_decode_str(raw_path)
        .decode_utf8()
        .unwrap_or_default()
        .to_string();

    // Handle directory paths, empty paths, and paths without extensions
    let path = if raw_path.is_empty() || raw_path == "index.html" {
        "index.html".to_string()
    } else if raw_path.ends_with('/') {
        format!("{}index.html", raw_path)
    } else {
        raw_path.clone()
    };

    // Store the normalized path for pageview tracking (without index.html suffix)
    let pageview_path = if raw_path.is_empty() {
        "/".to_string()
    } else {
        format!("/{}", raw_path.trim_end_matches("index.html").trim_end_matches('/'))
    };
    let pageview_path = if pageview_path.is_empty() { "/".to_string() } else { pageview_path };

    let key = if subdomain.is_empty() {
        path.to_string()
    } else {
        format!("{}/{}", subdomain, path)
    };

    // Determine the file extension
    let extension = path.split('.').last().unwrap_or_default();

    // Check if the extension is html, htm, or js, or json
    if extension != "html" && extension != "htm" && extension != "js" && extension != "json" {
        // Redirect to the specified URL
        let redirect_url = format!("https://r2.naru.pub/{}/{}", subdomain, path);
        return Ok(Response::builder()
            .status(302) // HTTP status code for redirection
            .header("Location", redirect_url)
            .body(Full::new(Bytes::from("Redirecting...")))
            .unwrap());
    }

    // Get the object from S3
    match state.s3_client
        .get_object()
        .bucket(&state.bucket_name)
        .key(key)
        .send()
        .await
    {
        Ok(resp) => {
            let content_type = resp.content_type.clone().unwrap_or_default();
            let data = resp.body.collect().await?.into_bytes();

            // Record pageview for HTML pages only (fire-and-forget)
            if extension == "html" || extension == "htm" {
                record_pageview(
                    state.db_pool.clone(),
                    subdomain,
                    pageview_path,
                    client_ip,
                );
            }

            Ok(Response::builder()
                .status(200)
                .header("content-type", content_type)
                .body(Full::new(data))
                .unwrap())
        }
        Err(err) => {
            eprintln!("Error fetching from S3: {}", err);
            Ok(Response::builder()
                .status(404)
                .body(Full::new(Bytes::from("Not Found")))
                .unwrap())
        }
    }
}
