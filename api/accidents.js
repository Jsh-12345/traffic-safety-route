import { handleAccidents } from '../server/accidents.js'
export default function handler(req, res) {
  return handleAccidents(req, res, process.env.DATA_GO_KR_SERVICE_KEY)
}
