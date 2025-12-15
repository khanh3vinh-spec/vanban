export interface TTSConfig {
  text: string;
  voice: string;
  speed: number;
}

export enum TTSStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GeneratedAudio {
  blob: Blob;
  url: string;
}
