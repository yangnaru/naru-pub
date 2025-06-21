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

// Configuration struct
struct Config {
    bucket_name: String,
    account_id: String,
    access_key_id: String,
    secret_access_key: String,
    port: u16,
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

    // Create a TCP listener
    let addr = format!("localhost:{}", config.port);
    let listener = TcpListener::bind(&addr).await?;
    println!("Server running on http://{}", addr);

    // Handle incoming connections
    loop {
        let (stream, _) = listener.accept().await?;
        let io = TokioIo::new(stream);
        let s3_client = s3_client.clone();
        let bucket_name = config.bucket_name.clone();

        // Spawn a new task for each connection
        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(
                    io,
                    service_fn(move |req| handle_request(req, s3_client.clone(), bucket_name.clone())),
                )
                .await
            {
                eprintln!("Error serving connection: {}", err);
            }
        });
    }
}

// Handle individual HTTP requests
async fn handle_request(
    req: Request<hyper::body::Incoming>,
    s3_client: S3Client,
    bucket_name: String,
) -> Result<Response<Full<Bytes>>> {
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
        .unwrap_or_default();
    
    let path = req.uri().path().trim_start_matches('/');
    // URL decode the path
    let path = percent_decode_str(path)
        .decode_utf8()
        .unwrap_or_default()
        .to_string();

    // Handle directory paths, empty paths, and paths without extensions
    let path = if path.is_empty() || path == "index.html" {
        "index.html".to_string()
    } else if path.ends_with('/') || (!path.contains('.') && !path.is_empty()) {
        if path.ends_with('/') {
            format!("{}index.html", path)
        } else {
            format!("{}/index.html", path)
        }
    } else {
        path.to_string()
    };
    
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
    match s3_client
        .get_object()
        .bucket(&bucket_name)
        .key(key)
        .send()
        .await
    {
        Ok(resp) => {
            let data = resp.body.collect().await?.into_bytes();
            Ok(Response::builder()
                .status(200)
                .header("content-type", resp.content_type.unwrap_or_default())
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
