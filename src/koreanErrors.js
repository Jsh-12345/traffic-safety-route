const AUTH_MESSAGES = new Map([
  ['invalid_credentials', '이메일·닉네임 또는 비밀번호를 확인해 주세요.'],
  ['email_not_confirmed', '가입 확인 메일의 링크를 눌러 이메일을 인증해 주세요.'],
  ['email_exists', '이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.'],
  ['user_already_exists', '이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.'],
  ['email_address_invalid', '이메일 주소 형식을 확인해 주세요.'],
  ['email_address_not_authorized', '이 이메일 주소로는 인증 메일을 보낼 수 없습니다. 다른 주소를 사용해 주세요.'],
  ['weak_password', '보안 요건에 맞는 더 강한 비밀번호를 입력해 주세요.'],
  ['same_password', '기존 비밀번호와 다른 새 비밀번호를 입력해 주세요.'],
  ['over_email_send_rate_limit', '메일 요청이 너무 많습니다. 잠시 후 다시 요청해 주세요.'],
  ['over_request_rate_limit', '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'],
  ['otp_expired', '인증 링크가 만료됐습니다. 새 메일을 요청해 주세요.'],
])

export function koreanError(error, fallback, { keepKorean = true } = {}) {
  const message = typeof error === 'string' ? error : error?.message
  const authMessage = AUTH_MESSAGES.get(error?.code)
  if (authMessage) return authMessage
  if (/^invalid login credentials$/i.test(message)) return AUTH_MESSAGES.get('invalid_credentials')
  if (error?.status === 429) return AUTH_MESSAGES.get('over_request_rate_limit')
  if (error?.name === 'AuthRetryableFetchError' || /^(failed to fetch|networkerror when attempting to fetch resource\.?|load failed)$/i.test(message)) {
    return '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'
  }
  if (keepKorean && typeof message === 'string' && /[가-힣]/.test(message)) return message
  return fallback
}

export function accountError(error, mode) {
  if (mode === 'signup' && (error?.code === 'unexpected_failure' || /database error saving new user/i.test(error?.message))) {
    return '가입하지 못했습니다. 이미 사용 중인 닉네임일 수 있으니 다른 닉네임으로 다시 시도해 주세요. 계속 실패하면 관리자에게 문의해 주세요.'
  }
  const action = { login: '로그인', signup: '회원가입', reset: '재설정 메일 보내기', update: '비밀번호 변경' }[mode] || '요청 처리'
  return koreanError(error, `${action}에 실패했습니다. 잠시 후 다시 시도해 주세요.`)
}
