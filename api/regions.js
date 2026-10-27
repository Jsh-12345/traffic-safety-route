import { handleApi } from '../server/kakao.js'
export default function handler(req, res) {
  return handleApi(req, res, 'regions', process.env.KAKAO_REST_API_KEY)
}
