use actix_web::{http::StatusCode, ResponseError};
use serde::Serialize;
use std::fmt::{Display, Formatter, Result as FmtResult};

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    NotFound(String),
    Internal(String),
}

impl Display for ApiError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            ApiError::BadRequest(m) => write!(f, "{}", m),
            ApiError::NotFound(m) => write!(f, "{}", m),
            ApiError::Internal(m) => write!(f, "{}", m),
        }
    }
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ApiError::NotFound(_) => StatusCode::NOT_FOUND,
            ApiError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

impl actix_web::Responder for ApiError {
    type Body = actix_web::body::BoxBody;
    fn respond_to(self, _req: &actix_web::HttpRequest) -> actix_web::HttpResponse<Self::Body> {
        let status = self.status_code();
        let body = actix_web::web::Json(ErrorResponse { error: self.to_string() });
        actix_web::HttpResponse::build(status).json(body.0)
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(e: anyhow::Error) -> Self {
        ApiError::Internal(e.to_string())
    }
}
