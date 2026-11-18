// 현재 추천 결과를 기준으로 지도 선의 색상과 굵기를 결정합니다.
export function routeAppearance(id, recommendedId) {
  return id === recommendedId
    ? { color: '#2563eb', weight: 8, opacity: 1, dashArray: null }
    : { color: '#087f5b', weight: 4, opacity: .85, dashArray: '8 6' }
}

// 추천 경로를 마지막에 그려 공유 도로에서도 파란 선이 보이게 합니다.
export function routeDrawOrder(routes, recommendedId) {
  return [...routes.filter(r => r.id !== recommendedId), ...routes.filter(r => r.id === recommendedId)]
}
