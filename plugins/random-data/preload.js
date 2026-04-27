const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '谢', '邹', '喻', '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎', '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳']
const nameChars = ['子', '一', '宇', '泽', '辰', '睿', '嘉', '明', '景', '安', '梓', '浩', '然', '文', '思', '语', '若', '清', '宁', '欣', '雨', '涵', '瑶', '妍', '璇', '知', '遥', '昕', '芮', '可', '乐', '南', '北', '川', '舟', '航', '屿', '森', '朗', '越', '恒', '卓', '瑜', '诺', '尧', '晗', '奕', '庭', '沐', '栩', '棠', '初', '夏', '禾', '橙']
const phonePrefixes = ['130', '131', '132', '133', '135', '136', '137', '138', '139', '150', '151', '152', '155', '156', '157', '158', '159', '166', '170', '171', '172', '173', '175', '176', '177', '178', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', '198', '199']
const provinces = ['京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼']
const areas = [
  { code: '110105', province: '北京市', city: '北京市', district: '朝阳区' },
  { code: '110108', province: '北京市', city: '北京市', district: '海淀区' },
  { code: '310101', province: '上海市', city: '上海市', district: '黄浦区' },
  { code: '310115', province: '上海市', city: '上海市', district: '浦东新区' },
  { code: '440106', province: '广东省', city: '广州市', district: '天河区' },
  { code: '440305', province: '广东省', city: '深圳市', district: '南山区' },
  { code: '330106', province: '浙江省', city: '杭州市', district: '西湖区' },
  { code: '320102', province: '江苏省', city: '南京市', district: '玄武区' },
  { code: '510107', province: '四川省', city: '成都市', district: '武侯区' },
  { code: '420106', province: '湖北省', city: '武汉市', district: '武昌区' },
  { code: '610113', province: '陕西省', city: '西安市', district: '雁塔区' },
  { code: '350203', province: '福建省', city: '厦门市', district: '思明区' }
]
const roads = ['人民路', '建设路', '解放路', '中山路', '和平路', '新华路', '青年路', '长江路', '黄河路', '科技路', '文昌路', '滨河路', '望江路', '星河路']
const buildings = ['国际中心', '时代广场', '创业园', '未来城', '阳光花园', '金茂大厦', '云海公馆', '星辰社区', '绿地中心', '创智园']
const domains = ['example.com', 'demo.cn', 'test.io', 'mail.test', 'sample.net']
const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'nova', 'orbit', 'pixel', 'river', 'stone', 'tango', 'vector', 'zen']
const companySuffixes = ['科技有限公司', '信息技术有限公司', '网络科技有限公司', '贸易有限公司', '文化传媒有限公司', '企业管理有限公司', '电子商务有限公司', '智能科技有限公司']
const jobs = ['产品经理', '前端工程师', '后端工程师', '测试工程师', '运维工程师', '数据分析师', '设计师', '运营专员', '项目经理', '销售经理', '财务专员', '人事专员']
const sentenceParts = ['系统正在处理新的测试数据', '用户提交了一条有效记录', '页面展示了完整的业务信息', '接口返回了稳定的响应结果', '流程进入下一步审批节点', '任务已经同步到目标环境', '配置项保持默认状态', '数据已写入临时表']
const bankPrefixes = ['622202', '622848', '621226', '622700', '621661', '622262', '622588', '621098', '622155', '622689']
const englishFirstNames = ['James', 'Robert', 'John', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Daniel', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen']
const englishLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Martin', 'Lee', 'Perez']
const mimeTypes = ['application/json', 'application/xml', 'application/pdf', 'application/zip', 'text/plain', 'text/html', 'text/csv', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'audio/mpeg']
const fileExtensions = ['txt', 'json', 'csv', 'xlsx', 'pdf', 'png', 'jpg', 'webp', 'zip', 'log', 'md', 'docx']
const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge']
const systems = ['Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64', 'iPhone; CPU iPhone OS 17_0 like Mac OS X']
const nonsensePieces = ['这件事情从结果来看其实并不复杂', '但是如果换一个角度继续分析', '很多细节又会呈现出完全不同的状态', '所以我们需要在现有基础上保持观察', '并且结合上下文做出相对稳妥的判断', '换句话说这并不是单一变量造成的现象', '而是多个条件同时作用后的阶段性结果', '从实际体验来看这种说法也比较容易理解', '当然这里还可以继续补充更多背景信息', '以便让整体表达显得更加完整和自然', '在没有额外限制的前提下', '这个结论基本可以满足当前场景的需要', '后续如果条件发生变化', '对应的处理方式也可以继续调整', '这就是目前比较常见的一种说明方式']
const chineseWords = ['测试', '数据', '流程', '系统', '用户', '订单', '配置', '接口', '任务', '状态', '记录', '页面', '服务', '节点', '环境', '权限', '消息', '文件', '缓存', '日志']
const emojis = ['😀', '😄', '😉', '😍', '🤔', '😎', '🥳', '👍', '🔥', '✨', '🚀', '🌟', '🍀', '🎯', '📌', '✅', '💡', '📦', '🧪', '🛠️']

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(list) {
  return list[randomInt(0, list.length - 1)]
}

function pad(value, length) {
  return String(value).padStart(length, '0')
}

function randomDigits(length) {
  let text = ''

  for (let index = 0; index < length; index += 1) {
    text += randomInt(0, 9)
  }

  return text
}

function formatDate(date, withTime) {
  const value = `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`

  if (!withTime) {
    return value
  }

  return `${value} ${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}`
}

function createName() {
  let name = pick(surnames)
  const length = Math.random() < 0.35 ? 1 : 2

  for (let index = 0; index < length; index += 1) {
    name += pick(nameChars)
  }

  return name
}

function createPhone() {
  return `${pick(phonePrefixes)}${randomDigits(8)}`
}

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, value => {
    const number = randomInt(0, 15)
    return (value === 'x' ? number : (number & 0x3) | 0x8).toString(16)
  })
}

function createUuid32() {
  return createUuid().replace(/-/g, '')
}

function createAddress() {
  const area = pick(areas)
  const city = area.province === area.city ? '' : area.city
  return `${area.province}${city}${area.district}${pick(roads)}${randomInt(1, 999)}号${pick(buildings)}${randomInt(1, 28)}栋${randomInt(101, 3202)}室`
}

function createIdCard() {
  const area = pick(areas)
  const year = randomInt(1970, 2005)
  const month = randomInt(1, 12)
  const day = randomInt(1, new Date(year, month, 0).getDate())
  const body = `${area.code}${year}${pad(month, 2)}${pad(day, 2)}${randomDigits(3)}`
  const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checks = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0

  for (let index = 0; index < body.length; index += 1) {
    sum += Number(body[index]) * factors[index]
  }

  return `${body}${checks[sum % 11]}`
}

function luhnCheckDigit(body) {
  let sum = 0
  let doubleDigit = true

  for (let index = body.length - 1; index >= 0; index -= 1) {
    let number = Number(body[index])

    if (doubleDigit) {
      number *= 2

      if (number > 9) {
        number -= 9
      }
    }

    sum += number
    doubleDigit = !doubleDigit
  }

  return String((10 - (sum % 10)) % 10)
}

function createBankCard() {
  const body = `${pick(bankPrefixes)}${randomDigits(12)}`
  return `${body}${luhnCheckDigit(body)}`
}

function createUsername() {
  return `${pick(words)}_${pick(words)}_${randomInt(10, 9999)}`
}

function createEmail() {
  return `${createUsername()}@${pick(domains)}`
}

function createPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  let text = ''

  for (let index = 0; index < 16; index += 1) {
    text += chars[randomInt(0, chars.length - 1)]
  }

  return text
}

function createDate(offsetStart, offsetEnd) {
  const date = new Date()
  date.setDate(date.getDate() + randomInt(offsetStart, offsetEnd))
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59), 0)
  return date
}

function createUrl() {
  return `https://${pick(words)}.${pick(['com', 'cn', 'net', 'io'])}/${pick(words)}/${randomInt(1000, 999999)}`
}

function createIp() {
  return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`
}

function createIpv6() {
  const parts = []

  for (let index = 0; index < 8; index += 1) {
    parts.push(randomInt(0, 65535).toString(16))
  }

  return parts.join(':')
}

function createMac() {
  const parts = []

  for (let index = 0; index < 6; index += 1) {
    parts.push(pad(randomInt(0, 255).toString(16).toUpperCase(), 2))
  }

  return parts.join(':')
}

function createCompany() {
  return `${pick(areas).city}${pick(words).replace(/^\w/, value => value.toUpperCase())}${pick(companySuffixes)}`
}

function createPlate() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let text = `${pick(provinces)}${letters[randomInt(0, letters.length - 1)]}`

  for (let index = 0; index < 5; index += 1) {
    text += chars[randomInt(0, chars.length - 1)]
  }

  return text
}

function createColor() {
  return `#${randomInt(0, 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`
}

function createSentence() {
  return `${pick(sentenceParts)}，编号为 ${randomInt(100000, 999999)}。`
}

function createParagraph() {
  const length = randomInt(3, 5)
  const list = []

  for (let index = 0; index < length; index += 1) {
    list.push(createSentence())
  }

  return list.join('')
}

function createNonsense(length) {
  let text = ''

  while (text.length < length) {
    text += pick(nonsensePieces)
    text += pick(['，', '。'])
  }

  const result = text.slice(0, length)
  return /[，。]$/.test(result) ? result : `${result.slice(0, length - 1)}。`
}

function createOrderNo() {
  const date = new Date()
  return `DD${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}${randomDigits(10)}`
}

function createCoordinate() {
  return `${(Math.random() * 180 - 90).toFixed(6)}, ${(Math.random() * 360 - 180).toFixed(6)}`
}

function createMoney() {
  return (Math.random() * 999999 + 1).toFixed(2)
}

function createEnglishName() {
  return `${pick(englishFirstNames)} ${pick(englishLastNames)}`
}

function createDomain() {
  return `${pick(words)}-${randomInt(10, 999)}.${pick(['com', 'cn', 'net', 'io', 'dev'])}`
}

function createFileName() {
  return `${pick(words)}-${Date.now()}-${randomInt(100, 999)}.${pick(fileExtensions)}`
}

function createBase64() {
  const text = `${pick(words)}:${randomDigits(12)}:${Date.now()}`

  if (typeof btoa === 'function') {
    return btoa(text)
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text).toString('base64')
  }

  return text
}

function createHex(length) {
  const chars = '0123456789abcdef'
  let text = ''

  for (let index = 0; index < length; index += 1) {
    text += chars[randomInt(0, chars.length - 1)]
  }

  return text
}

function createToken() {
  return `${createHex(16)}.${createHex(24)}.${createHex(32)}`
}

function createJson() {
  return JSON.stringify({
    id: createUuid32(),
    name: createName(),
    phone: createPhone(),
    email: createEmail(),
    amount: createMoney(),
    enabled: Math.random() < 0.5
  })
}

function createCsv() {
  return ['id,name,phone,email', `1,${createName()},${createPhone()},${createEmail()}`, `2,${createName()},${createPhone()},${createEmail()}`].join('\n')
}

function createCron() {
  return `${randomInt(0, 59)} ${randomInt(0, 23)} ${randomInt(1, 28)} ${randomInt(1, 12)} *`
}

function createVersion() {
  return `${randomInt(0, 9)}.${randomInt(0, 20)}.${randomInt(0, 99)}`
}

function createUserAgent() {
  const browser = pick(browsers)
  const system = pick(systems)

  if (browser === 'Safari') {
    return `Mozilla/5.0 (${system}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${randomInt(14, 18)}.0 Safari/605.1.15`
  }

  return `Mozilla/5.0 (${system}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/${randomInt(90, 126)}.0.${randomInt(1000, 9999)}.${randomInt(10, 200)} Safari/537.36`
}

function createRgb() {
  return `rgb(${randomInt(0, 255)}, ${randomInt(0, 255)}, ${randomInt(0, 255)})`
}

function createSku() {
  return `SKU-${pick(words).toUpperCase()}-${randomInt(100000, 999999)}`
}

function createChineseWord() {
  return `${pick(chineseWords)}${pick(chineseWords)}`
}

async function complete(text) {
  if (typeof window.ztools.hideMainWindowTypeString === 'function') {
    window.ztools.hideMainWindowTypeString(text)
    window.ztools.outPlugin()
    return
  }

  if (typeof window.ztools.sendInputEvent === 'function') {
    await window.ztools.hideMainWindow(true)

    for (const char of text) {
      window.ztools.sendInputEvent({ type: 'char', keyCode: char })
    }
  }

  window.ztools.outPlugin()
}

function createHandler(creator) {
  return {
    mode: 'none',
    args: {
      async enter() {
        const text = creator()
        await complete(text)
        return { success: true, data: text }
      }
    }
  }
}

window.exports = {
  randomName: createHandler(createName),
  randomPhone: createHandler(createPhone),
  randomUuid: createHandler(createUuid),
  randomUuid32: createHandler(createUuid32),
  randomAddress: createHandler(createAddress),
  randomIdCard: createHandler(createIdCard),
  randomBankCard: createHandler(createBankCard),
  randomEmail: createHandler(createEmail),
  randomUsername: createHandler(createUsername),
  randomPassword: createHandler(createPassword),
  randomDate: createHandler(() => formatDate(createDate(-3650, 3650), false)),
  randomDateTime: createHandler(() => formatDate(createDate(-3650, 3650), true)),
  randomTimestamp: createHandler(() => String(createDate(-3650, 3650).getTime())),
  randomUrl: createHandler(createUrl),
  randomIp: createHandler(createIp),
  randomIpv6: createHandler(createIpv6),
  randomMac: createHandler(createMac),
  randomCompany: createHandler(createCompany),
  randomJob: createHandler(() => pick(jobs)),
  randomPlate: createHandler(createPlate),
  randomPostcode: createHandler(() => randomDigits(6)),
  randomColor: createHandler(createColor),
  randomNumber: createHandler(() => String(randomInt(0, 1000000))),
  randomMoney: createHandler(createMoney),
  randomBoolean: createHandler(() => String(Math.random() < 0.5)),
  randomBooleanUpper: createHandler(() => String(Math.random() < 0.5).toUpperCase()),
  randomBooleanNumber: createHandler(() => String(randomInt(0, 1))),
  randomInteger: createHandler(() => String(randomInt(-1000000, 1000000))),
  randomDecimal: createHandler(() => (Math.random() * 100000).toFixed(4)),
  randomNegativeNumber: createHandler(() => String(-randomInt(1, 1000000))),
  randomPercentage: createHandler(() => `${(Math.random() * 100).toFixed(2)}%`),
  randomSentence: createHandler(createSentence),
  randomParagraph: createHandler(createParagraph),
  randomNonsense100: createHandler(() => createNonsense(100)),
  randomNonsense200: createHandler(() => createNonsense(200)),
  randomNonsense300: createHandler(() => createNonsense(300)),
  randomNonsense500: createHandler(() => createNonsense(500)),
  randomOrderNo: createHandler(createOrderNo),
  randomCoordinate: createHandler(createCoordinate),
  randomEnglishName: createHandler(createEnglishName),
  randomAge: createHandler(() => String(randomInt(1, 99))),
  randomGender: createHandler(() => pick(['男', '女', '未知'])),
  randomDomain: createHandler(createDomain),
  randomFileName: createHandler(createFileName),
  randomMime: createHandler(() => pick(mimeTypes)),
  randomBase64: createHandler(createBase64),
  randomToken: createHandler(createToken),
  randomMd5: createHandler(() => createHex(32)),
  randomSha1: createHandler(() => createHex(40)),
  randomSha256: createHandler(() => createHex(64)),
  randomJson: createHandler(createJson),
  randomCsv: createHandler(createCsv),
  randomCron: createHandler(createCron),
  randomVersion: createHandler(createVersion),
  randomUserAgent: createHandler(createUserAgent),
  randomRgb: createHandler(createRgb),
  randomEmoji: createHandler(() => pick(emojis)),
  randomSku: createHandler(createSku),
  randomChineseWord: createHandler(createChineseWord)
}
