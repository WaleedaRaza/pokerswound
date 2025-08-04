import { EntropySample } from '../types'
import { estimateEntropyBits } from '../utils'

export interface AudioProcessorConfig {
  sampleRate: number
  bitDepth: number
  channels: number
  minAmplitude: number
  maxAmplitude: number
}

export class AudioProcessor {
  private config: AudioProcessorConfig

  constructor(config: Partial<AudioProcessorConfig> = {}) {
    this.config = {
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      minAmplitude: -32768,
      maxAmplitude: 32767,
      ...config
    }
  }

  /**
   * Process audio data to extract entropy
   */
  processAudioData(
    audioData: Float32Array | Int16Array,
    sourceId: string,
    timestamp: number
  ): EntropySample {
    // Convert to normalized float array if needed
    const normalizedData = this.normalizeAudioData(audioData)
    
    // Extract entropy from amplitude variations
    const amplitudeEntropy = this.extractAmplitudeEntropy(normalizedData)
    
    // Extract entropy from frequency domain
    const frequencyEntropy = this.extractFrequencyEntropy(normalizedData)
    
    // Combine both entropy sources
    const totalEntropy = amplitudeEntropy + frequencyEntropy
    
    // Create entropy sample
    return {
      sourceId,
      timestamp,
      data: this.audioDataToString(audioData),
      entropyBits: Math.floor(totalEntropy),
      quality: this.calculateQuality(normalizedData)
    }
  }

  /**
   * Normalize audio data to float array
   */
  private normalizeAudioData(audioData: Float32Array | Int16Array): Float32Array {
    if (audioData instanceof Float32Array) {
      return audioData
    }

    const normalized = new Float32Array(audioData.length)
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] / this.config.maxAmplitude
    }
    return normalized
  }

  /**
   * Extract entropy from amplitude variations
   */
  private extractAmplitudeEntropy(audioData: Float32Array): number {
    if (audioData.length < 2) return 0

    // Calculate amplitude differences
    const differences = new Float32Array(audioData.length - 1)
    for (let i = 1; i < audioData.length; i++) {
      differences[i - 1] = Math.abs(audioData[i] - audioData[i - 1])
    }

    // Convert to Buffer for entropy estimation
    const buffer = Buffer.from(differences.buffer)
    return estimateEntropyBits(buffer)
  }

  /**
   * Extract entropy from frequency domain
   */
  private extractFrequencyEntropy(audioData: Float32Array): number {
    if (audioData.length < 64) return 0

    // Simple frequency analysis using FFT-like approach
    const frequencies = this.simpleFFT(audioData)
    
    // Convert to Buffer for entropy estimation
    const buffer = Buffer.from(frequencies.buffer)
    return estimateEntropyBits(buffer)
  }

  /**
   * Simple FFT-like frequency analysis
   */
  private simpleFFT(audioData: Float32Array): Float32Array {
    const n = Math.min(audioData.length, 1024) // Limit to 1024 samples
    const frequencies = new Float32Array(n / 2)

    for (let k = 0; k < n / 2; k++) {
      let real = 0
      let imag = 0

      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * k * i) / n
        real += audioData[i] * Math.cos(angle)
        imag += audioData[i] * Math.sin(angle)
      }

      frequencies[k] = Math.sqrt(real * real + imag * imag)
    }

    return frequencies
  }

  /**
   * Calculate quality score for audio data
   */
  private calculateQuality(audioData: Float32Array): number {
    if (audioData.length === 0) return 0

    // Calculate RMS (Root Mean Square) amplitude
    let rms = 0
    for (let i = 0; i < audioData.length; i++) {
      rms += audioData[i] * audioData[i]
    }
    rms = Math.sqrt(rms / audioData.length)

    // Calculate dynamic range
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < audioData.length; i++) {
      min = Math.min(min, audioData[i])
      max = Math.max(max, audioData[i])
    }
    const dynamicRange = max - min

    // Quality based on RMS and dynamic range
    const rmsQuality = Math.min(rms * 10, 1) // Normalize RMS
    const rangeQuality = Math.min(dynamicRange, 1) // Normalize range

    return (rmsQuality + rangeQuality) / 2
  }

  /**
   * Convert audio data to string for storage
   */
  private audioDataToString(audioData: Float32Array | Int16Array): string {
    // Take a sample of the data to avoid huge strings
    const sampleSize = Math.min(audioData.length, 100)
    const sample = audioData.slice(0, sampleSize)
    
    return sample.join(',')
  }

  /**
   * Get processor configuration
   */
  getConfig(): AudioProcessorConfig {
    return { ...this.config }
  }
} 