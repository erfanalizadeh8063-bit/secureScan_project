use actix_web::{post, web, HttpResponse};
use serde::Deserialize;
use serde_json::json;

use crate::db::DbPool;
use crate::domain::errors::ApiError;
use crate::domain::users_repo;

use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use password_hash::SaltString;
use rand_core::OsRng;

#[derive(Debug, Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
}

/// POST /api/auth/register
#[post("/api/auth/register")]
pub async fn register(
    pool: web::Data<DbPool>,
    payload: web::Json<RegisterBody>,
) -> Result<HttpResponse, ApiError> {
    let email = payload.email.trim().to_lowercase();
    let password = payload.password.trim().to_string();

    if email.is_empty() || !email.contains('@') {
        return Err(ApiError::BadRequest("invalid email".into()));
    }
    if password.len() < 8 {
        return Err(ApiError::BadRequest(
            "password must be at least 8 characters".into(),
        ));
    }

    // چک کنیم ایمیل قبلاً ثبت نشده باشد
    if let Some(_) = users_repo::find_user_by_email(pool.get_ref(), &email)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?
    {
        return Err(ApiError::BadRequest("email already registered".into()));
    }

    // ساخت hash امن با Argon2 (salt تصادفی)
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| ApiError::Internal(e.to_string()))?
        .to_string();

    // ساخت کاربر در دیتابیس
    let user = users_repo::create_user(pool.get_ref(), &email, &password_hash)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    Ok(HttpResponse::Created().json(json!({
        "id": user.id,
        "email": user.email,
    })))
}

/// POST /api/auth/login
#[post("/api/auth/login")]
pub async fn login(
    pool: web::Data<DbPool>,
    payload: web::Json<LoginBody>,
) -> Result<HttpResponse, ApiError> {
    let email = payload.email.trim().to_lowercase();
    let password = payload.password.trim().to_string();

    // کاربر با ایمیل
    let user_opt = users_repo::find_user_by_email(pool.get_ref(), &email)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    let user = match user_opt {
        Some(u) => u,
        None => {
            return Err(ApiError::BadRequest("invalid credentials".into()));
        }
    };

    // verify password
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    let argon2 = Argon2::default();
    if argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return Err(ApiError::BadRequest("invalid credentials".into()));
    }

    // فعلاً یک "توکن" ساده (در فاز بعد JWT یا مشابه می‌سازیم)
    Ok(HttpResponse::Ok().json(json!({
        "id": user.id,
        "email": user.email,
        "token": user.id, // فقط placeholder
    })))
}
