export enum CallbackQueryId {
  // Main Menu
  MAIN_MODE_SELECTION = 'main_mode_selection',
  MAIN_SPEECH_TO_TEXT = 'main_speech_to_text',
  MAIN_TRANSLATE = 'main_translate',
  MAIN_PRONUNCIATION = 'main_pronunciation',
  MAIN_TTS = 'main_tts',
  MAIN_SETTINGS = 'main_settings',
  MAIN_USER_STATE = 'main_user_state',
  MAIN_REGISTER = 'main_register',
  // Settings Menu
  SETTINGS_NATIVE = 'settings_native',
  SETTINGS_TARGET = 'settings_target',
  BACK_TO_MAIN = 'back_to_main',
  BACK_TO_SETTINGS = 'back_to_settings',
  // Language Selection (Example: set_native_zh, set_target_en)
  SET_NATIVE_PREFIX = 'set_native_',
  SET_TARGET_PREFIX = 'set_target_',
  // Mode Switching
  SWITCH_TO_STT = 'switch_mode_stt',
  SWITCH_TO_TRANSLATE = 'switch_mode_translate',
  SWITCH_TO_PRONUNCIATION = 'switch_mode_pronunciation',
  SWITCH_TO_TTS = 'switch_mode_tts',
  SWITCH_TO_IDLE = 'switch_mode_idle',
}
