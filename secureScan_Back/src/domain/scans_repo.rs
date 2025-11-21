use crate::db::DbPool;
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct ScanRow {
    pub id: Uuid,
    pub url: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ScanResultRow {
    pub id: Uuid,
    pub scan_id: Uuid,
    pub headers: Option<JsonValue>,
    pub ssl_grade: Option<String>,
    pub issues: Option<JsonValue>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Row type برای لیست اسکن‌ها + خلاصه‌ی آخرین نتیجه
#[derive(Debug, Serialize, FromRow)]
pub struct ScanListRow {
    pub id: Uuid,
    pub url: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub issues: Option<JsonValue>,
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

/// لیست اسکن‌ها + آخرین نتیجه‌ی هر اسکن (اگر باشد)
pub async fn list_scans(pool: &DbPool) -> Result<Vec<ScanListRow>, sqlx::Error> {
    let rows = sqlx::query_as::<_, ScanListRow>(
        r#"
        WITH latest AS (
            SELECT
                r.scan_id,
                r.completed_at,
                r.issues,
                ROW_NUMBER() OVER (
                    PARTITION BY r.scan_id
                    ORDER BY r.completed_at DESC NULLS LAST, r.id DESC
                ) AS rn
            FROM scan_results r
        )
        SELECT
            s.id,
            s.url,
            s.status,
            s.created_at,
            l.completed_at,
            l.issues
        FROM scans s
        LEFT JOIN latest l
            ON l.scan_id = s.id AND l.rn = 1
        ORDER BY s.created_at DESC
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

pub async fn update_scan_status(
    pool: &DbPool,
    id: Uuid,
    status: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE scans
        SET status = $1
        WHERE id = $2
        "#,
    )
    .bind(status)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_scan_result(
    pool: &DbPool,
    scan_id: Uuid,
    headers: Option<JsonValue>,
    ssl_grade: Option<String>,
    issues: JsonValue,
    completed_at: DateTime<Utc>,
) -> Result<ScanResultRow, sqlx::Error> {
    let row = sqlx::query_as::<_, ScanResultRow>(
        r#"
        INSERT INTO scan_results (scan_id, headers, ssl_grade, issues, completed_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, scan_id, headers, ssl_grade, issues, completed_at
        "#,
    )
    .bind(scan_id)
    .bind(headers)
    .bind(ssl_grade)
    .bind(issues)
    .bind(completed_at)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn get_latest_scan_result(
    pool: &DbPool,
    scan_id: Uuid,
) -> Result<Option<ScanResultRow>, sqlx::Error> {
    let row = sqlx::query_as::<_, ScanResultRow>(
        r#"
        SELECT id, scan_id, headers, ssl_grade, issues, completed_at
        FROM scan_results
        WHERE scan_id = $1
        ORDER BY completed_at DESC NULLS LAST, id DESC
        LIMIT 1
        "#,
    )
    .bind(scan_id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}
