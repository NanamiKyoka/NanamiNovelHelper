use uuid::Uuid;

pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn generate_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}
