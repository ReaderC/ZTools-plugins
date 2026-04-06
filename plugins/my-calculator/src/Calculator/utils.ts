/**
 * 计算器工具函数
 * 使用逆波兰表达式算法解析和计算数学表达式
 */

// 运算符优先级
const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
}

// 判断是否为运算符
function isOperator(token: string): boolean {
  return token in PRECEDENCE
}

// 获取运算符优先级
function getPrecedence(token: string): number {
  return PRECEDENCE[token] ?? 0
}

// 表达式词法分析
function tokenize(expression: string): string[] {
  const tokens: string[] = []
  let i = 0
  const expr = expression.replace(/\s+/g, '')

  while (i < expr.length) {
    const char = expr[i]

    // 数字（包括小数）
    if (/\d/.test(char)) {
      let num = ''
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i++]
      }
      tokens.push(num)
    }
    // 运算符和括号
    else if ('+-*/%()'.includes(char)) {
      tokens.push(char)
      i++
    } else {
      i++
    }
  }

  return tokens
}

// 逆波兰表达式转换
function toRPN(expression: string): string[] {
  const tokens = tokenize(expression)
  const output: string[] = []
  const stack: string[] = []

  for (const token of tokens) {
    if (/^\d/.test(token)) {
      output.push(token)
    } else if (token === '%') {
      // 百分号：前一个数除以100
      if (output.length > 0) {
        const last = output.pop()!
        if (last === ')') {
          // 括号内的百分号
          output.push(last)
          output.push('%')
        } else if (isOperator(last)) {
          // 运算符前的百分号：X + % 表示 X * (Y/100) 其中Y是再前一个
          // 简化处理：直接转为小数
          output.push('0')
          output.push('%')
        } else {
          // 数字直接转为百分数
          const num = parseFloat(last) / 100
          output.push(num.toString())
        }
      }
    } else if (token === '(') {
      stack.push(token)
    } else if (token === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        output.push(stack.pop()!)
      }
      stack.pop() // 弹出 '('
    } else if (isOperator(token)) {
      while (
        stack.length > 0 &&
        stack[stack.length - 1] !== '(' &&
        getPrecedence(stack[stack.length - 1]) >= getPrecedence(token)
      ) {
        output.push(stack.pop()!)
      }
      stack.push(token)
    }
  }

  while (stack.length > 0) {
    output.push(stack.pop()!)
  }

  return output
}

// 计算逆波兰表达式
function evaluateRPN(rpn: string[]): number {
  const stack: number[] = []

  for (const token of rpn) {
    if (token === '%') {
      // 百分号：栈顶元素除以100
      if (stack.length > 0) {
        const num = stack.pop()!
        stack.push(num / 100)
      }
    } else if (isOperator(token)) {
      const b = stack.pop()!
      const a = stack.pop()!
      let result: number

      switch (token) {
        case '+':
          result = a + b
          break
        case '-':
          result = a - b
          break
        case '*':
          result = a * b
          break
        case '/':
          if (b === 0) throw new Error('Division by zero')
          result = a / b
          break
        default:
          result = 0
      }

      stack.push(result)
    } else {
      stack.push(parseFloat(token))
    }
  }

  return stack[0] ?? 0
}

// 四舍五入到指定小数位（处理浮点精度问题）
function roundResult(num: number, decimals: number = 10): number {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

// 主计算函数
export function calculate(expression: string): { result: string; error: boolean } {
  try {
    // 清理表达式
    const cleaned = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/٪/g, '%')

    if (!cleaned.trim()) {
      return { result: '0', error: false }
    }

    const rpn = toRPN(cleaned)
    const result = evaluateRPN(rpn)

    if (!isFinite(result)) {
      return { result: 'Error', error: true }
    }

    // 格式化结果
    const rounded = roundResult(result)
    const resultStr = rounded.toString()

    // 如果结果是大数，使用科学计数法
    if (Math.abs(rounded) >= 1e15) {
      return { result: rounded.toExponential(6), error: false }
    }

    return { result: resultStr, error: false }
  } catch (e) {
    return { result: 'Error', error: true }
  }
}

// 验证表达式是否合法
export function isValidExpression(expression: string): boolean {
  const cleaned = expression.replace(/\s+/g, '')

  // 检查非法连续运算符
  if (/[+\-*/%]{2,}/.test(cleaned)) return false

  // 检查括号是否匹配
  let parens = 0
  for (const char of cleaned) {
    if (char === '(') parens++
    if (char === ')') parens--
    if (parens < 0) return false
  }
  if (parens !== 0) return false

  // 不能以运算符结尾（除了右括号）
  if (/[+\-*/%]$/.test(cleaned)) return false

  return true
}

// 追加内容到表达式
export function appendToExpression(
  current: string,
  value: string,
  hasResult: boolean
): string {
  // 如果有结果且用户输入运算符，用结果作为起始
  if (hasResult && isOperator(value)) {
    return current + value
  }

  // 如果有结果且用户输入数字或括号，清空
  if (hasResult && /[\d(]/.test(value)) {
    return value
  }

  // 防止表达式过长
  if (current.length >= 50) {
    return current
  }

  return current + value
}

// 判断是否为运算符
export function isOperatorChar(char: string): boolean {
  return '+-*/%'.includes(char)
}
