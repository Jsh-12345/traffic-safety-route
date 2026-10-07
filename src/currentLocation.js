export function getCurrentLocation() {
  if (!navigator.geolocation) return Promise.reject(new Error('이 브라우저에서는 현재 위치를 사용할 수 없습니다.'))
  if (!window.isSecureContext) return Promise.reject(new Error('현재 위치는 HTTPS 또는 localhost에서만 사용할 수 있습니다.'))

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      error => {
        const messages = {
          1: '위치 권한이 차단되었습니다. 브라우저의 주소창에서 위치 권한을 허용한 뒤 다시 시도하세요.',
          2: '현재 위치를 확인할 수 없습니다. 기기의 위치 서비스를 확인하세요.',
          3: '위치 확인 시간이 초과되었습니다. 다시 시도하세요.',
        }
        reject(new Error(messages[error.code] || '현재 위치를 가져오지 못했습니다.'))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  })
}
