FROM rust:1.89

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

RUN cargo build --release

EXPOSE 5000

CMD ["cargo", "run", "--release"]