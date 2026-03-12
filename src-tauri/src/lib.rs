mod db;
mod ai;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Load environment variables for local dev
            dotenvy::from_path("../.env").ok();
            
            // Initialize Database Schema
            db::schema::init(app.handle());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::commands::get_leads,
            db::commands::update_lead_status,
            db::commands::add_leads,
            db::commands::get_call_logs,
            db::commands::add_call_log,
            db::commands::get_lead_call_logs,
            db::commands::get_lead_notes,
            db::commands::add_lead_note,
            db::commands::delete_lead,
            ai::gemini::simulate_lead_scraping,
            ai::gemini::process_onboarding_chat,
            ai::gemini::analyze_call_transcript
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
