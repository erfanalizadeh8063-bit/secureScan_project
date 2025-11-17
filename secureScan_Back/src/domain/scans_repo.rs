use crate::db::DbPool;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct ScanRow {
    pub id: Uuid,
    pub url: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

pub async fn create_scan(pool: &DbPool, url: &str) -> Result<ScanRow, sqlx::Error> {
    let rec = sqlx::query_as::<_, ScanRow>(
        r#"
        INSERT INTO scans (url, status)
        VALUES ($1, 'queued')
        RETURNING id, url, status, created_at
        "#,
    )
    .bind(url)
    .fetch_one(pool)
    .await?;

    Ok(rec)
}

pub async fn list_scans(pool: &DbPool) -> Result<Vec<ScanRow>, sqlx::Error> {
    let rows = sqlx::query_as::<_, ScanRow>(
        r#"
        SELECT id, url, status, created_at
        FROM scans
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn get_scan(pool: &DbPool, id: Uuid) -> Result<Option<ScanRow>, sqlx::Error> {
    let row = sqlx::query_as::<_, ScanRow>(
        r#"
        SELECT id, url, status, created_at
        FROM scans
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}
