/**
 * Azure Speech SDK 回應類型定義
 * 來源：老專案 app_papa_legba
 */
export interface AzurePhoneme {
  Phoneme: string
  PronunciationAssessment: {
    AccuracyScore: number
  }
  Offset: number
  Duration: number
}
export interface AzureWord {
  Word: string
  Duration: number
  Offset: number
  PronunciationAssessment: {
    AccuracyScore: number
  }
  Phonemes?: AzurePhoneme[]
}
export interface AzureWordWithErrorType extends AzureWord {
  PronunciationAssessment: {
    AccuracyScore: number
    ErrorType: string
  }
}
export interface AzureNBest {
  Confidence: number
  Lexical: string
  ITN: string
  MaskedITN: string
  Display: string
  Words: AzureWord[]
  PronunciationAssessment: {
    AccuracyScore: number
    FluencyScore: number
    ProsodyScore?: number
  }
}
export interface AzureJsonResult {
  Id: string
  RecognitionStatus: string
  Offset: number
  Duration: number
  Channel: number
  DisplayText: string
  SNR: number
  NBest: AzureNBest[]
}
