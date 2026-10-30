// Generate a unique device ID for single-device enforcement
export function getDeviceId() {
  const STORAGE_KEY = 'focusforge_device_id'
  
  // Check if device ID already exists
  let deviceId = localStorage.getItem(STORAGE_KEY)
  
  if (!deviceId) {
    // Generate a random installation ID without fingerprinting device properties
    deviceId = generateInstallationId()
    localStorage.setItem(STORAGE_KEY, deviceId)
  }
  
  return deviceId
}

function generateInstallationId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getDeviceName() {
  const ua = navigator.userAgent
  
  // Detect device type
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'Android Phone'
    return 'Android Tablet'
  }
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux'
  
  return 'Unknown Device'
}
