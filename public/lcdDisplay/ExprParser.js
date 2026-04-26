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
            if (expr[i] === '!') { tokens.push({ type: 'NOT' }); i++; continue; }
            if (expr[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
            if (expr[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
            if (expr[i] === '=' && i + 1 < len && expr[i + 1] === '=') {
                tokens.push({ type: 'EQ' }); i += 2; continue;
            }
            // 識別子または数値定数
            let j = i;
            while (j < len && expr[j] !== ' ' && expr[j] !== '(' && expr[j] !== ')' && expr[j] !== '!'
                   && !(expr[j] === '=' && j + 1 < len && expr[j + 1] === '=')) {
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

        // 比較式: value (== value)?
        const parseComparison = () => {
            const leftVal = parseValue();
            if (peek().type === 'EQ') {
                consume();
                const rightVal = parseValue();
                const leftNum  = Number(leftVal);
                const rightNum = Number(rightVal);
                // 両辺が数値に変換できる場合は数値比較、それ以外は文字列比較
                if (!isNaN(leftNum) && !isNaN(rightNum) && String(leftVal) !== '' && String(rightVal) !== '') {
                    return leftNum === rightNum;
                }
                return String(leftVal ?? '') === String(rightVal ?? '');
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
}
