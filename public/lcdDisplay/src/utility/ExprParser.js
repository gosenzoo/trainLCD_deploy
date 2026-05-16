// visible属性の論理式を評価する再帰下降パーサー
// eval(expr, resolveValue) を呼び出して使用する
// resolveValue: 変数名(ドット記法可) → 生の値 を返す関数
class ExprParser {

    // 式をトークン列に変換する
    tokenize(expr) {
        const tokens = [];
        let i = 0;
        const len = expr.length;
        while (i < len) {
            // 空白をスキップ
            while (i < len && expr[i] === ' ') i++;
            if (i >= len) break;
            // and キーワード（後続が空白・括弧・EOL）
            if (expr.startsWith('and', i) && (i + 3 >= len || expr[i + 3] === ' ' || expr[i + 3] === ')')) {
                tokens.push({ type: 'AND' }); i += 3; continue;
            }
            // or キーワード（後続が空白・括弧・EOL）
            if (expr.startsWith('or', i) && (i + 2 >= len || expr[i + 2] === ' ' || expr[i + 2] === ')')) {
                tokens.push({ type: 'OR' }); i += 2; continue;
            }
            // !=（NEQ）は !（NOT）より先にチェックする
            if (expr[i] === '!' && i + 1 < len && expr[i + 1] === '=') {
                tokens.push({ type: 'NEQ' }); i += 2; continue;
            }
            if (expr[i] === '!') { tokens.push({ type: 'NOT' }); i++; continue; }
            if (expr[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
            if (expr[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
            if (expr[i] === '=' && i + 1 < len && expr[i + 1] === '=') {
                tokens.push({ type: 'EQ' }); i += 2; continue;
            }
            // 不等号（<=, >= は <, > より先にチェックする）
            if (expr[i] === '<' && i + 1 < len && expr[i + 1] === '=') {
                tokens.push({ type: 'LTE' }); i += 2; continue;
            }
            if (expr[i] === '>' && i + 1 < len && expr[i + 1] === '=') {
                tokens.push({ type: 'GTE' }); i += 2; continue;
            }
            if (expr[i] === '<') { tokens.push({ type: 'LT' }); i++; continue; }
            if (expr[i] === '>') { tokens.push({ type: 'GT' }); i++; continue; }
            // 四則演算子
            if (expr[i] === '+') { tokens.push({ type: 'PLUS'  }); i++; continue; }
            if (expr[i] === '-') { tokens.push({ type: 'MINUS' }); i++; continue; }
            if (expr[i] === '*') { tokens.push({ type: 'MUL'   }); i++; continue; }
            if (expr[i] === '/') { tokens.push({ type: 'DIV'   }); i++; continue; }
            // 識別子または数値定数（演算子・不等号でも区切る）
            let j = i;
            while (j < len && expr[j] !== ' ' && expr[j] !== '(' && expr[j] !== ')' && expr[j] !== '!'
                   && !(expr[j] === '=' && j + 1 < len && expr[j + 1] === '=')
                   && expr[j] !== '+' && expr[j] !== '-' && expr[j] !== '*' && expr[j] !== '/'
                   && expr[j] !== '<' && expr[j] !== '>') {
                j++;
            }
            const word = expr.slice(i, j);
            if (word) {
                const num = Number(word);
                tokens.push((!isNaN(num) && word !== '') ? { type: 'NUMBER', value: num } : { type: 'IDENT', value: word });
            }
            i = j;
        }
        tokens.push({ type: 'EOF' });
        return tokens;
    }

    // 式を評価して boolean を返す
    // resolveValue: 変数名 → 生の値 を返す関数
    eval(expr, resolveValue) {
        const tokens = this.tokenize(expr);
        let pos = 0;
        const peek    = () => tokens[pos];
        const consume = () => tokens[pos++];

        // or式: andExpr (or andExpr)*
        const parseOr = () => {
            let result = parseAnd();
            while (peek().type === 'OR') {
                consume();
                const right = parseAnd();
                result = result || right;
            }
            return result;
        };

        // and式: notExpr (and notExpr)*
        const parseAnd = () => {
            let result = parseNot();
            while (peek().type === 'AND') {
                consume();
                const right = parseNot();
                result = result && right;
            }
            return result;
        };

        // 否定式: !notExpr | primary
        const parseNot = () => {
            if (peek().type === 'NOT') { consume(); return !parseNot(); }
            return parsePrimary();
        };

        // primary: (expr) | comparison
        const parsePrimary = () => {
            if (peek().type === 'LPAREN') {
                consume();
                const result = parseOr();
                if (peek().type === 'RPAREN') consume();
                return result;
            }
            return parseComparison();
        };

        // 比較式: value (== | != | < | > | <= | >= value)?
        const parseComparison = () => {
            const leftVal = parseValue();
            const opType  = peek().type;
            if (opType === 'EQ' || opType === 'NEQ' || opType === 'LT' || opType === 'GT' || opType === 'LTE' || opType === 'GTE') {
                consume();
                const rightVal = parseValue();
                const leftNum  = Number(leftVal);
                const rightNum = Number(rightVal);
                // 両辺が数値に変換できる場合は数値比較、それ以外は文字列比較
                if (!isNaN(leftNum) && !isNaN(rightNum) && String(leftVal) !== '' && String(rightVal) !== '') {
                    if (opType === 'EQ')  return leftNum === rightNum;
                    if (opType === 'NEQ') return leftNum !== rightNum;
                    if (opType === 'LT')  return leftNum  <  rightNum;
                    if (opType === 'GT')  return leftNum  >  rightNum;
                    if (opType === 'LTE') return leftNum  <= rightNum;
                    if (opType === 'GTE') return leftNum  >= rightNum;
                }
                const leftStr  = String(leftVal  ?? '');
                const rightStr = String(rightVal ?? '');
                if (opType === 'EQ')  return leftStr === rightStr;
                if (opType === 'NEQ') return leftStr !== rightStr;
                if (opType === 'LT')  return leftStr  <  rightStr;
                if (opType === 'GT')  return leftStr  >  rightStr;
                if (opType === 'LTE') return leftStr  <= rightStr;
                if (opType === 'GTE') return leftStr  >= rightStr;
            }
            return !!leftVal;
        };

        // 値: 数値定数 | 識別子
        const parseValue = () => {
            const tok = peek();
            if (tok.type === 'NUMBER') { consume(); return tok.value; }
            if (tok.type === 'IDENT')  { consume(); return resolveValue(tok.value); }
            return undefined;
        };

        return !!parseOr();
    }

    // 算術式を評価して数値を返す（slotNum/slotPoint等の数値属性用）
    // +, -, *, / と括弧・変数参照・単項マイナスに対応する
    // eval()がboolean固定であるのに対し、このメソッドは生の数値を返す
    evalNumber(expr, resolveValue) {
        const tokens = this.tokenize(expr);
        let pos = 0;
        const peek    = () => tokens[pos];
        const consume = () => tokens[pos++];

        // 加減算: mulExpr (('+' | '-') mulExpr)*
        const parseAdd = () => {
            let result = parseMul();
            while (peek().type === 'PLUS' || peek().type === 'MINUS') {
                const op = consume().type;
                const right = parseMul();
                result = op === 'PLUS' ? result + right : result - right;
            }
            return result;
        };

        // 乗除算: unary (('*' | '/') unary)*
        const parseMul = () => {
            let result = parseUnary();
            while (peek().type === 'MUL' || peek().type === 'DIV') {
                const op = consume().type;
                const right = parseUnary();
                result = op === 'MUL' ? result * right : (right !== 0 ? result / right : NaN);
            }
            return result;
        };

        // 単項マイナス: '-' unary | primary
        const parseUnary = () => {
            if (peek().type === 'MINUS') { consume(); return -parseUnary(); }
            return parsePrimary();
        };

        // primary: '(' addExpr ')' | NUMBER | IDENT
        const parsePrimary = () => {
            const tok = peek();
            if (tok.type === 'LPAREN') {
                consume();
                const result = parseAdd();
                if (peek().type === 'RPAREN') consume();
                return result;
            }
            if (tok.type === 'NUMBER') { consume(); return tok.value; }
            if (tok.type === 'IDENT')  { consume(); return Number(resolveValue(tok.value)); }
            return NaN;
        };

        return parseAdd();
    }
}
