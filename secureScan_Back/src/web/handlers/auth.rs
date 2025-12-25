use actix_web::{post, web, HttpResponse, Result};
use serde::Deserialize;

use crate::db::DbPool;
use crate::services::auth as auth_svc;
use crate::services::auth::AuthError;

/// Request body for /api/auth/register
#[derive(Deserialize)]
pub struct RegisterPayload {
    pub email: String,
    pub password: String,
}

/// Request body for /api/auth/login
#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

/// POST /api/auth/register
/// Register a new user with email & password.
#[post("/api/auth/register")]
pub async fn register(
    pool: web::Data<DbPool>,
    payload: web::Json<RegisterPayload>,
) -> Result<HttpResponse> {
    let email = payload.email.trim();
    let password = payload.password.as_str();

    match auth_svc::register_user(&pool, email, password).await {
        Ok(user_id) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": user_id,
            "email": email,
        }))),
        Err(e) => {
            let resp = match e {
                AuthError::EmailTaken => {
                    HttpResponse::Conflict().json(serde_json::json!({
                        "error": "email_taken"
                    }))
                }
                AuthError::InvalidCredentials => {
                    HttpResponse::Unauthorized().json(serde_json::json!({
                        "error": "invalid_credentials"
                    }))
                }
                AuthError::Db(_) | AuthError::Hash => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "internal_error"
                    }))
                }
            };
            Ok(resp)
        }
    }
}

/// POST /api/auth/login
/// Log in a user with email & password.
#[post("/api/auth/login")]
pub async fn login(
    pool: web::Data<DbPool>,
    payload: web::Json<LoginPayload>,
) -> Result<HttpResponse> {
    let email = payload.email.trim();
    let password = payload.password.as_str();

    match auth_svc::login_user(&pool, email, password).await {
        Ok(user_id) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": user_id,
            "email": email,
        }))),
        Err(e) => {
            let resp = match e {
                AuthError::InvalidCredentials => {
                    HttpResponse::Unauthorized().json(serde_json::json!({
                        "error": "invalid_credentials"
                    }))
                }
                AuthError::EmailTaken => {
                    HttpResponse::BadRequest().json(serde_json::json!({
                        "error": "unexpected_email_taken"
                    }))
                }
                AuthError::Db(_) | AuthError::Hash => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "internal_error"
                    }))
                }
            };
            Ok(resp)
        }
    }
}
