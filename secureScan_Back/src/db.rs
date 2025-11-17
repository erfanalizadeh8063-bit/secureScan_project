use anyhow::Context;
use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::Pool;
use sqlx::Postgres;

pub type DbPool = Pool<Postgres>;

pub async fn init_pool() -> Result<DbPool> {
    // Load local .env during development if present
    let _ = dotenvy::dotenv();

    let url = std::env::var("DATABASE_URL").context("DATABASE_URL is not set")?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .context("failed to connect to database")?;

    // Run migrations bundled in ./migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("failed to run database migrations")?;

    Ok(pool)
}
