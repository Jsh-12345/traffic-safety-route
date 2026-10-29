import { handleNicknameLogin } from '../server/nicknameLogin.js'
export default function handler(req, res) {
  return handleNicknameLogin(req, res, process.env)
}
