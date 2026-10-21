const SAMPLES = {
        var: `// Variabel dan menampilkan nilai
let nama = "Dewi";
let umur = 17;
let aktif = true;
console.log(nama);
console.log(umur);
console.log(aktif);`,
        arr: `// Array
let nilai = [70, 85, 60, 95];
let total = 0;
for (let i = 0; i < nilai.length; i++) {
  total = total + nilai[i];
}
let rata = total / nilai.length;
console.log(rata);`,
        if: `// Percabangan (if / else if / else, dan switch)
let nilai = 78;
let grade = "";
switch (true) {
  case nilai >= 90:
    grade = "A";
    break;
  case nilai >= 75:
    grade = "B";
    break;
  default:
    grade = "C";
}
console.log(grade);`,
        ifsimple: `// Percabangan: if saja
let nilai = 80;
if (nilai >= 75) {
  console.log("Lulus");
}
console.log("Selesai diperiksa");`,
        ifelseif: `// Percabangan: if / else if
let nilai = 68;
if (nilai >= 90) {
  console.log("A");
} else if (nilai >= 75) {
  console.log("B");
} else if (nilai >= 60) {
  console.log("C");
}`,
        ifelseifelse: `// Percabangan: if / else if / else
let nilai = 55;
if (nilai >= 90) {
  console.log("A");
} else if (nilai >= 75) {
  console.log("B");
} else if (nilai >= 60) {
  console.log("C");
} else {
  console.log("Tidak lulus");
}`,
        loop: `// Perulangan: for, while, do-while
for (let i = 1; i <= 3; i++) {
  console.log(i);
}
let j = 0;
do {
  console.log(j);
  j++;
} while (j < 2);`,
        rec: `// Rekursi
function faktorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * faktorial(n - 1);
}
console.log(faktorial(4));`,
        nest: `// Nested percabangan di dalam perulangan
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    if ((i + j) % 2 === 0) {
      console.log(i, j, "genap");
    } else {
      console.log(i, j, "ganjil");
    }
  }
}`,
      };

      const SAMPLES_PY = {
        var: `# Variabel dan menampilkan nilai
nama = "Dewi"
umur = 17
aktif = True
print(nama)
print(umur)
print(aktif)`,
        arr: `# Array (list)
nilai = [70, 85, 60, 95]
total = 0
for i in range(len(nilai)):
    total = total + nilai[i]
rata = total / len(nilai)
print(rata)`,
        ifsimple: `# Percabangan: if saja
nilai = 80
if nilai >= 75:
    print("Lulus")
print("Selesai diperiksa")`,
        ifelseif: `# Percabangan: if / elif
nilai = 68
if nilai >= 90:
    print("A")
elif nilai >= 75:
    print("B")
elif nilai >= 60:
    print("C")`,
        ifelseifelse: `# Percabangan: if / elif / else
nilai = 55
if nilai >= 90:
    print("A")
elif nilai >= 75:
    print("B")
elif nilai >= 60:
    print("C")
else:
    print("Tidak lulus")`,
        loop: `# Perulangan: for dan while
for i in range(1, 4):
    print(i)
j = 0
while j < 2:
    print(j)
    j = j + 1`,
        rec: `# Rekursi
def faktorial(n):
    if n <= 1:
        return 1
    return n * faktorial(n - 1)
print(faktorial(4))`,
        nest: `# Nested percabangan di dalam perulangan
for i in range(1, 4):
    for j in range(1, 4):
        if (i + j) % 2 == 0:
            print(i, j, "genap")
        else:
            print(i, j, "ganjil")`,
      };

      /* ---------- Python → transpile ke sintaks yang dipahami tokenizer/parser JS ---------- */
      function stripHashComment(line) {
        let inQ = null,
          out = "";
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (inQ) {
            out += c;
            if (c === inQ && line[i - 1] !== "\\") inQ = null;
            continue;
          }
          if (c === '"' || c === "'") {
            inQ = c;
            out += c;
            continue;
          }
          if (c === "#") break;
          out += c;
        }
        return out;
      }
      function pyExprToJs(s) {
        if (!s) return s;
        s = s.replace(/\blen\(([A-Za-z_$][\w$]*)\)/g, "$1.length");
        s = s.replace(/\.append\(/g, ".push(");
        s = s
          .replace(/\bTrue\b/g, "true")
          .replace(/\bFalse\b/g, "false")
          .replace(/\bNone\b/g, "null");
        s = s
          .replace(/\band\b/g, "&&")
          .replace(/\bor\b/g, "||")
          .replace(/\bnot\b/g, "!");
        return s;
      }
      function splitTopLevelCommas(s) {
        const parts = [];
        let depth = 0,
          cur = "";
        for (const ch of s) {
          if (ch === "(" || ch === "[") depth++;
          if (ch === ")" || ch === "]") depth--;
          if (ch === "," && depth === 0) {
            parts.push(cur.trim());
            cur = "";
          } else cur += ch;
        }
        if (cur.trim() !== "") parts.push(cur.trim());
        return parts.filter((p) => p !== "");
      }
      function matchForRange(content) {
        const m = content.match(/^for\s+([A-Za-z_$][\w$]*)\s+in\s+range\(/);
        if (!m) return null;
        const varName = m[1];
        let i = m[0].length,
          depth = 1;
        const start = i;
        while (i < content.length && depth > 0) {
          if (content[i] === "(") depth++;
          else if (content[i] === ")") {
            depth--;
            if (depth === 0) break;
          }
          i++;
        }
        if (depth !== 0) return null;
        const argsRaw = content.slice(start, i);
        const rest = content.slice(i + 1).trim();
        if (rest !== ":") return null;
        return { varName, argsRaw };
      }
      function transformPyLine(content) {
        const fr = matchForRange(content);
        if (fr) {
          const args = splitTopLevelCommas(fr.argsRaw);
          let startE = "0",
            endE,
            stepE = "1";
          if (args.length === 1) endE = args[0];
          else if (args.length === 2) {
            startE = args[0];
            endE = args[1];
          } else {
            startE = args[0];
            endE = args[1];
            stepE = args[2];
          }
          const v = fr.varName;
          return {
            text: `for (let ${v} = ${pyExprToJs(startE)}; ${v} < ${pyExprToJs(endE)}; ${v} += ${pyExprToJs(stepE)}) {`,
            header: true,
          };
        }
        let m;
        if ((m = content.match(/^if\s+(.*):$/)))
          return { text: `if (${pyExprToJs(m[1])}) {`, header: true };
        if ((m = content.match(/^elif\s+(.*):$/)))
          return { text: `else if (${pyExprToJs(m[1])}) {`, header: true };
        if (/^else\s*:$/.test(content))
          return { text: `else {`, header: true };
        if ((m = content.match(/^while\s+(.*):$/)))
          return { text: `while (${pyExprToJs(m[1])}) {`, header: true };
        if (
          (m = content.match(
            /^def\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*:$/,
          ))
        )
          return { text: `function ${m[1]}(${m[2]}) {`, header: true };
        if (content === "pass") return { text: "", header: false };
        if (content === "break") return { text: "break;", header: false };
        if (content === "continue")
          return { text: "continue;", header: false };
        if ((m = content.match(/^return\b\s*(.*)$/)))
          return {
            text: `return${m[1] ? " " + pyExprToJs(m[1]) : ""};`,
            header: false,
          };
        if ((m = content.match(/^print\((.*)\)$/)))
          return {
            text: `console.log(${pyExprToJs(m[1])});`,
            header: false,
          };
        return { text: pyExprToJs(content) + ";", header: false };
      }
      function transpilePython(src) {
        const lines = src.split("\n");
        const out = [];
        const indentStack = [0];
        let pendingOpen = false;
        for (const raw of lines) {
          const noComment = stripHashComment(raw);
          const trimmed = noComment.trim();
          if (trimmed === "") {
            out.push("");
            continue;
          }
          const indentWidth = noComment.match(/^[ \t]*/)[0].replace(/\t/g, "    ")
            .length;
          let closeCount = 0;
          if (pendingOpen) {
            indentStack.push(indentWidth);
            pendingOpen = false;
          } else {
            while (indentWidth < indentStack[indentStack.length - 1]) {
              indentStack.pop();
              closeCount++;
            }
          }
          const { text, header } = transformPyLine(trimmed);
          out.push("}".repeat(closeCount) + text);
          if (header) pendingOpen = true;
        }
        const remaining = indentStack.length - 1;
        if (remaining > 0) out[out.length - 1] += "}".repeat(remaining);
        return out.join("\n");
      }

      /* ---------- Lexer ---------- */
      function tokenize(src) {
        const tokens = [];
        let i = 0,
          line = 1;
        const n = src.length;
        const isDigit = (c) => c >= "0" && c <= "9",
          isAlpha = (c) => /[A-Za-z_$]/.test(c),
          isAlnum = (c) => /[A-Za-z0-9_$]/.test(c);
        const threeOps = ["===", "!=="],
          twoOps = [
            "==",
            "!=",
            "<=",
            ">=",
            "&&",
            "||",
            "+=",
            "-=",
            "*=",
            "/=",
            "++",
            "--",
          ];
        const oneOps = "+-*/%<>=!",
          puncts = "(),;{}.[]:";
        while (i < n) {
          const c = src[i];
          if (c === "\n") {
            line++;
            i++;
            continue;
          }
          if (/\s/.test(c)) {
            i++;
            continue;
          }
          if (c === "/" && src[i + 1] === "/") {
            while (i < n && src[i] !== "\n") i++;
            continue;
          }
          if (isDigit(c)) {
            let j = i;
            while (j < n && (isDigit(src[j]) || src[j] === ".")) j++;
            tokens.push({
              type: "num",
              value: parseFloat(src.slice(i, j)),
              line,
            });
            i = j;
            continue;
          }
          if (c === '"' || c === "'") {
            const q = c;
            let j = i + 1,
              s = "";
            while (j < n && src[j] !== q) {
              s += src[j];
              j++;
            }
            tokens.push({ type: "str", value: s, line });
            i = j + 1;
            continue;
          }
          if (isAlpha(c)) {
            let j = i;
            while (j < n && isAlnum(src[j])) j++;
            const w = src.slice(i, j);
            const kws = [
              "let",
              "const",
              "var",
              "if",
              "else",
              "for",
              "while",
              "do",
              "switch",
              "case",
              "default",
              "break",
              "continue",
              "console",
              "true",
              "false",
              "function",
              "return",
            ];
            tokens.push({
              type: kws.includes(w) ? "kw" : "ident",
              value: w,
              line,
            });
            i = j;
            continue;
          }
          const three = src.slice(i, i + 3);
          if (threeOps.includes(three)) {
            tokens.push({ type: "op", value: three, line });
            i += 3;
            continue;
          }
          const two = src.slice(i, i + 2);
          if (twoOps.includes(two)) {
            tokens.push({ type: "op", value: two, line });
            i += 2;
            continue;
          }
          if (oneOps.includes(c)) {
            tokens.push({ type: "op", value: c, line });
            i++;
            continue;
          }
          if (puncts.includes(c)) {
            tokens.push({ type: "punct", value: c, line });
            i++;
            continue;
          }
          throw new Error(`Karakter tidak dikenal "${c}" di baris ${line}`);
        }
        tokens.push({ type: "eof", value: null, line });
        return tokens;
      }

      /* ---------- Parser ---------- */
      let toks, pos, nodeId;
      function peek() {
        return toks[pos];
      }
      function next() {
        return toks[pos++];
      }
      function expectPunct(v) {
        const t = next();
        if (t.type !== "punct" || t.value !== v)
          throw new Error(`Diharapkan "${v}" di baris ${t.line}`);
        return t;
      }
      function expectOp(v) {
        const t = next();
        if (t.type !== "op" || t.value !== v)
          throw new Error(`Diharapkan "${v}" di baris ${t.line}`);
        return t;
      }
      function isPunct(v) {
        const t = peek();
        return t.type === "punct" && t.value === v;
      }
      function isOp(v) {
        const t = peek();
        return t.type === "op" && t.value === v;
      }
      function isKw(v) {
        const t = peek();
        return t.type === "kw" && t.value === v;
      }

      function parseProgram() {
        const s = [];
        while (peek().type !== "eof") s.push(parseStatement());
        return s;
      }
      function parseBlock() {
        expectPunct("{");
        const s = [];
        while (!isPunct("}")) s.push(parseStatement());
        expectPunct("}");
        return s;
      }
      function parseStatement() {
        const t = peek();
        if (t.type === "kw" && ["let", "const", "var"].includes(t.value))
          return parseDeclStmt();
        if (isKw("if")) return parseIf();
        if (isKw("for")) return parseFor();
        if (isKw("while")) return parseWhile();
        if (isKw("do")) return parseDoWhile();
        if (isKw("switch")) return parseSwitch();
        if (isKw("break")) {
          const line = next().line;
          expectPunct(";");
          return { type: "break", line, id: nodeId++ };
        }
        if (isKw("continue")) {
          const line = next().line;
          expectPunct(";");
          return { type: "continue", line, id: nodeId++ };
        }
        if (isKw("console")) return parseLog();
        if (isKw("function")) return parseFuncDecl();
        if (isKw("return")) return parseReturn();
        if (t.type === "ident") {
          const nxt = toks[pos + 1];
          if (nxt && nxt.type === "punct" && nxt.value === "(")
            return parseCallStmt();
          if (nxt && nxt.type === "punct" && nxt.value === ".")
            return parseMethodStmt();
          return parseUpdateOrAssignStmt();
        }
        throw new Error(`Pernyataan tidak dikenali di baris ${t.line}`);
      }
      function parseFuncDecl() {
        const line = peek().line;
        next();
        const name = next().value;
        expectPunct("(");
        const params = [];
        if (!isPunct(")")) {
          params.push(next().value);
          while (isPunct(",")) {
            next();
            params.push(next().value);
          }
        }
        expectPunct(")");
        const body = parseBlock();
        return { type: "funcdecl", name, params, body, line, id: nodeId++ };
      }
      function parseReturn() {
        const line = peek().line;
        next();
        let expr = null;
        if (!isPunct(";")) expr = parseExpr();
        expectPunct(";");
        return { type: "return", expr, line, id: nodeId++ };
      }
      function parseCallStmt() {
        const line = peek().line;
        const name = next().value;
        expectPunct("(");
        const args = [];
        if (!isPunct(")")) {
          args.push(parseExpr());
          while (isPunct(",")) {
            next();
            args.push(parseExpr());
          }
        }
        expectPunct(")");
        expectPunct(";");
        return { type: "callstmt", name, args, line, id: nodeId++ };
      }
      function parseMethodStmt() {
        const line = peek().line;
        const objName = next().value;
        expectPunct(".");
        const name = next().value;
        expectPunct("(");
        const args = [];
        if (!isPunct(")")) {
          args.push(parseExpr());
          while (isPunct(",")) {
            next();
            args.push(parseExpr());
          }
        }
        expectPunct(")");
        expectPunct(";");
        return { type: "methodstmt", objName, name, args, line, id: nodeId++ };
      }
      function parseDeclStmt() {
        const line = peek().line;
        next();
        const name = next().value;
        expectOp("=");
        const expr = parseExpr();
        expectPunct(";");
        return { type: "decl", name, expr, line, id: nodeId++ };
      }
      function parseUpdateNoSemi() {
        const line = peek().line;
        const name = next().value;
        let target = { type: "var", name, line };
        while (isPunct("[")) {
          next();
          const idx = parseExpr();
          expectPunct("]");
          target = { type: "index", obj: target, index: idx, line };
        }
        if (target.type === "var" && (isOp("++") || isOp("--"))) {
          const op = next().value;
          return { type: "update", name, op, line, id: nodeId++ };
        }
        let op = "=";
        if (isOp("=")) next();
        else if (
          peek().type === "op" &&
          ["+=", "-=", "*=", "/="].includes(peek().value)
        )
          op = next().value;
        else throw new Error(`Pernyataan tidak valid di baris ${line}`);
        const expr = parseExpr();
        if (target.type === "var")
          return {
            type: "assign",
            name: target.name,
            op,
            expr,
            line,
            id: nodeId++,
          };
        return { type: "indexassign", target, op, expr, line, id: nodeId++ };
      }
      function parseUpdateOrAssignStmt() {
        if (peek().type !== "ident")
          throw new Error(`Pernyataan tidak dikenali di baris ${peek().line}`);
        const node = parseUpdateNoSemi();
        expectPunct(";");
        return node;
      }
      function parseIf() {
        const line = peek().line;
        next();
        expectPunct("(");
        const cond = parseExpr();
        expectPunct(")");
        const then = parseBlock();
        let els = null;
        if (isKw("else")) {
          next();
          els = isKw("if") ? [parseIf()] : parseBlock();
        }
        return { type: "if", cond, then, els, line, id: nodeId++ };
      }
      function parseFor() {
        const line = peek().line;
        next();
        expectPunct("(");
        let init = null;
        if (!isPunct(";")) {
          if (isKw("let") || isKw("const") || isKw("var")) {
            next();
            const name = next().value;
            expectOp("=");
            const expr = parseExpr();
            init = { type: "decl", name, expr, line, id: nodeId++ };
          } else init = parseUpdateNoSemi();
        }
        expectPunct(";");
        const cond = isPunct(";") ? { type: "lit", value: true } : parseExpr();
        expectPunct(";");
        let update = null;
        if (!isPunct(")")) update = parseUpdateNoSemi();
        expectPunct(")");
        const body = parseBlock();
        return { type: "for", init, cond, update, body, line, id: nodeId++ };
      }
      function parseWhile() {
        const line = peek().line;
        next();
        expectPunct("(");
        const cond = parseExpr();
        expectPunct(")");
        const body = parseBlock();
        return { type: "while", cond, body, line, id: nodeId++ };
      }
      function parseDoWhile() {
        const line = peek().line;
        next();
        const body = parseBlock();
        if (!isKw("while"))
          throw new Error(
            `Diharapkan "while" setelah blok do (baris ${peek().line})`,
          );
        next();
        expectPunct("(");
        const cond = parseExpr();
        expectPunct(")");
        expectPunct(";");
        return { type: "dowhile", cond, body, line, id: nodeId++ };
      }
      function parseSwitch() {
        const line = peek().line;
        next();
        expectPunct("(");
        const disc = parseExpr();
        expectPunct(")");
        expectPunct("{");
        const cases = [];
        while (!isPunct("}")) {
          if (isKw("case")) {
            next();
            const test = parseExpr();
            expectPunct(":");
            const body = [];
            while (!isKw("case") && !isKw("default") && !isPunct("}"))
              body.push(parseStatement());
            cases.push({ test, body });
          } else if (isKw("default")) {
            next();
            expectPunct(":");
            const body = [];
            while (!isKw("case") && !isKw("default") && !isPunct("}"))
              body.push(parseStatement());
            cases.push({ test: null, body });
          } else
            throw new Error(
              `Diharapkan "case" atau "default" di baris ${peek().line}`,
            );
        }
        expectPunct("}");
        return { type: "switch", disc, cases, line, id: nodeId++ };
      }
      function parseLog() {
        const line = peek().line;
        next();
        expectPunct(".");
        const m = next().value;
        if (m !== "log")
          throw new Error(`Hanya console.log yang didukung (baris ${line})`);
        expectPunct("(");
        const args = [];
        if (!isPunct(")")) {
          args.push(parseExpr());
          while (isPunct(",")) {
            next();
            args.push(parseExpr());
          }
        }
        expectPunct(")");
        expectPunct(";");
        return { type: "log", args, line, id: nodeId++ };
      }
      function parseExpr() {
        return parseOr();
      }
      function parseOr() {
        let l = parseAnd();
        while (isOp("||")) {
          next();
          l = { type: "bin", op: "||", l, r: parseAnd() };
        }
        return l;
      }
      function parseAnd() {
        let l = parseEq();
        while (isOp("&&")) {
          next();
          l = { type: "bin", op: "&&", l, r: parseEq() };
        }
        return l;
      }
      function parseEq() {
        let l = parseRel();
        while (
          peek().type === "op" &&
          ["===", "!==", "==", "!="].includes(peek().value)
        ) {
          const op = next().value;
          l = { type: "bin", op, l, r: parseRel() };
        }
        return l;
      }
      function parseRel() {
        let l = parseAdd();
        while (
          peek().type === "op" &&
          ["<", ">", "<=", ">="].includes(peek().value)
        ) {
          const op = next().value;
          l = { type: "bin", op, l, r: parseAdd() };
        }
        return l;
      }
      function parseAdd() {
        let l = parseMul();
        while (peek().type === "op" && ["+", "-"].includes(peek().value)) {
          const op = next().value;
          l = { type: "bin", op, l, r: parseMul() };
        }
        return l;
      }
      function parseMul() {
        let l = parseUnary();
        while (peek().type === "op" && ["*", "/", "%"].includes(peek().value)) {
          const op = next().value;
          l = { type: "bin", op, l, r: parseUnary() };
        }
        return l;
      }
      function parseUnary() {
        if (isOp("!") || isOp("-")) {
          const op = next().value;
          return { type: "un", op, e: parseUnary() };
        }
        return parsePrimary();
      }
      function parsePrimary() {
        let node = parseAtomBase();
        while (true) {
          if (isPunct("[")) {
            const line = peek().line;
            next();
            const idx = parseExpr();
            expectPunct("]");
            node = { type: "index", obj: node, index: idx, line };
            continue;
          }
          if (isPunct(".")) {
            next();
            const mt = next();
            const mname = mt.value;
            if (isPunct("(")) {
              next();
              const args = [];
              if (!isPunct(")")) {
                args.push(parseExpr());
                while (isPunct(",")) {
                  next();
                  args.push(parseExpr());
                }
              }
              expectPunct(")");
              node = {
                type: "methodcall",
                obj: node,
                name: mname,
                args,
                line: mt.line,
                id: nodeId++,
              };
              continue;
            }
            node = { type: "member", obj: node, name: mname, line: mt.line };
            continue;
          }
          break;
        }
        return node;
      }
      function parseAtomBase() {
        const t = peek();
        if (t.type === "num") {
          next();
          return { type: "lit", value: t.value };
        }
        if (t.type === "str") {
          next();
          return { type: "lit", value: t.value };
        }
        if (t.type === "kw" && (t.value === "true" || t.value === "false")) {
          next();
          return { type: "lit", value: t.value === "true" };
        }
        if (isPunct("[")) {
          next();
          const elems = [];
          if (!isPunct("]")) {
            elems.push(parseExpr());
            while (isPunct(",")) {
              next();
              elems.push(parseExpr());
            }
          }
          expectPunct("]");
          return { type: "arrlit", elems };
        }
        if (t.type === "ident") {
          next();
          if (isPunct("(")) {
            next();
            const args = [];
            if (!isPunct(")")) {
              args.push(parseExpr());
              while (isPunct(",")) {
                next();
                args.push(parseExpr());
              }
            }
            expectPunct(")");
            return {
              type: "call",
              name: t.value,
              args,
              line: t.line,
              id: nodeId++,
            };
          }
          return { type: "var", name: t.value };
        }
        if (t.type === "punct" && t.value === "(") {
          next();
          const e = parseExpr();
          expectPunct(")");
          return e;
        }
        throw new Error(`Ekspresi tidak valid di baris ${t.line}`);
      }

      /* ---------- Evaluator / Interpreter ---------- */
      function evalExpr(n, env) {
        switch (n.type) {
          case "lit":
            return n.value;
          case "var":
            if (!(n.name in env))
              throw new Error(`Variabel "${n.name}" belum dideklarasikan`);
            return env[n.name];
          case "arrlit":
            return n.elems.map((e) => evalExpr(e, env));
          case "index": {
            const o = evalExpr(n.obj, env);
            const i = evalExpr(n.index, env);
            if (!Array.isArray(o))
              throw new Error(
                `Bukan array, tidak bisa diindeks (baris ${n.line})`,
              );
            if (i < 0 || i >= o.length)
              throw new Error(
                `Indeks ${i} di luar jangkauan array (baris ${n.line})`,
              );
            return o[i];
          }
          case "member": {
            const o = evalExpr(n.obj, env);
            if (n.name === "length") {
              if (Array.isArray(o) || typeof o === "string") return o.length;
              throw new Error(
                `"length" hanya untuk array/string (baris ${n.line})`,
              );
            }
            throw new Error(
              `Properti "${n.name}" tidak dikenal (baris ${n.line})`,
            );
          }
          case "methodcall": {
            const o = evalExpr(n.obj, env);
            const argVals = n.args.map((a) => evalExpr(a, env));
            if (Array.isArray(o)) {
              switch (n.name) {
                case "push":
                  o.push(...argVals);
                  return o.length;
                case "pop":
                  return o.pop();
                case "shift":
                  return o.shift();
                case "unshift":
                  o.unshift(...argVals);
                  return o.length;
                case "join":
                  return o.join(argVals[0] !== undefined ? argVals[0] : ",");
                case "includes":
                  return o.includes(argVals[0]);
                case "indexOf":
                  return o.indexOf(argVals[0]);
                case "slice":
                  return o.slice(...argVals);
              }
            }
            throw new Error(
              `Metode "${n.name}" tidak didukung (baris ${n.line})`,
            );
          }
          case "un":
            return n.op === "!" ? !evalExpr(n.e, env) : -evalExpr(n.e, env);
          case "bin": {
            if (n.op === "&&") return evalExpr(n.l, env) && evalExpr(n.r, env);
            if (n.op === "||") return evalExpr(n.l, env) || evalExpr(n.r, env);
            const l = evalExpr(n.l, env),
              r = evalExpr(n.r, env);
            switch (n.op) {
              case "+":
                return l + r;
              case "-":
                return l - r;
              case "*":
                return l * r;
              case "/":
                return l / r;
              case "%":
                return l % r;
              case "===":
                return l === r;
              case "!==":
                return l !== r;
              case "==":
                return l == r;
              case "!=":
                return l != r;
              case "<":
                return l < r;
              case ">":
                return l > r;
              case "<=":
                return l <= r;
              case ">=":
                return l >= r;
            }
          }
          case "call": {
            const argVals = n.args.map((a) => evalExpr(a, env));
            return callFunction(n.name, argVals, n.line, n.id);
          }
        }
      }
      class ReturnSignal {
        constructor(value) {
          this.value = value;
        }
      }
      class BreakSignal {}
      class ContinueSignal {}
      let functions = {};
      function callFunction(name, argVals, line, id) {
        const fn = functions[name];
        if (!fn) throw new Error(`Fungsi "${name}" belum dideklarasikan`);
        const savedEnv = env;
        const newEnv = {};
        fn.params.forEach((p, i) => {
          newEnv[p] = argVals[i];
        });
        env = newEnv;
        pushStep(id, line, `Panggil ${name}(${argVals.map(fmt).join(", ")})`);
        let retVal;
        try {
          execStmts(fn.body);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            retVal = e.value;
          } else {
            env = savedEnv;
            throw e;
          }
        }
        env = savedEnv;
        pushStep(
          id,
          line,
          `Kembali dari ${name}()${retVal !== undefined ? " dengan nilai " + fmt(retVal) : ""}`,
        );
        return retVal;
      }
      function fmt(v) {
        if (Array.isArray(v))
          return v.length
            ? v.map((x, i) => `[${i}]:${fmt(x)}`).join(" ")
            : "[] (kosong)";
        return typeof v === "string" ? v : JSON.stringify(v);
      }
      function fmtHTML(v) {
        if (Array.isArray(v)) {
          if (!v.length) return '<span class="struct-empty">[ ] kosong</span>';
          return (
            '<span class="arrcells">' +
            v
              .map(
                (x, i) =>
                  `<span class="arrcell"><span class="cv">${esc(fmt(x))}</span><span class="ci">${i}</span></span>`,
              )
              .join("") +
            "</span>"
          );
        }
        return esc(fmt(v));
      }
      let env, steps, stepCount;
      const MAX_STEPS = 400;
      function snap() {
        const o = {};
        for (const k in env)
          o[k] = Array.isArray(env[k]) ? env[k].slice() : env[k];
        return o;
      }
      function pushStep(id, line, note, output) {
        steps.push({
          id,
          line,
          vars: snap(),
          output: output !== undefined ? output : null,
          note,
        });
        stepCount++;
        if (stepCount > MAX_STEPS) throw new Error("__MAXSTEPS__");
      }
      function execStmts(list) {
        for (const s of list) execStmt(s);
      }
      function resolveIndexTarget(target, env) {
        const arr = evalExpr(target.obj, env);
        if (!Array.isArray(arr))
          throw new Error(`Target bukan array (baris ${target.line})`);
        const idx = evalExpr(target.index, env);
        return { arr, idx };
      }
      function execStmt(n) {
        switch (n.type) {
          case "decl": {
            const v = evalExpr(n.expr, env);
            env[n.name] = v;
            pushStep(n.id, n.line, `Deklarasi: ${n.name} = ${fmt(v)}`);
            break;
          }
          case "assign": {
            const v = evalExpr(n.expr, env);
            const cur = env[n.name];
            if (n.op !== "=" && !(n.name in env))
              throw new Error(`Variabel "${n.name}" belum dideklarasikan`);
            const nv =
              n.op === "="
                ? v
                : n.op === "+="
                  ? cur + v
                  : n.op === "-="
                    ? cur - v
                    : n.op === "*="
                      ? cur * v
                      : cur / v;
            env[n.name] = nv;
            pushStep(n.id, n.line, `${n.name} diperbarui menjadi ${fmt(nv)}`);
            break;
          }
          case "indexassign": {
            const { arr, idx } = resolveIndexTarget(n.target, env);
            const v = evalExpr(n.expr, env);
            const cur = arr[idx];
            const nv =
              n.op === "="
                ? v
                : n.op === "+="
                  ? cur + v
                  : n.op === "-="
                    ? cur - v
                    : n.op === "*="
                      ? cur * v
                      : cur / v;
            arr[idx] = nv;
            pushStep(
              n.id,
              n.line,
              `${exprStr(n.target)} diperbarui menjadi ${fmt(nv)}`,
            );
            break;
          }
          case "update": {
            env[n.name] = n.op === "++" ? env[n.name] + 1 : env[n.name] - 1;
            pushStep(
              n.id,
              n.line,
              `${n.name}${n.op} → menjadi ${fmt(env[n.name])}`,
            );
            break;
          }
          case "log": {
            const vals = n.args.map((a) => evalExpr(a, env));
            const out = vals.map(fmt).join(" ");
            pushStep(n.id, n.line, `console.log → mencetak: ${out}`, out);
            break;
          }
          case "funcdecl":
            break;
          case "callstmt": {
            const argVals = n.args.map((a) => evalExpr(a, env));
            callFunction(n.name, argVals, n.line, n.id);
            break;
          }
          case "methodstmt": {
            const arr = env[n.objName];
            if (arr === undefined)
              throw new Error(
                `Variabel "${n.objName}" belum dideklarasikan (baris ${n.line})`,
              );
            if (!Array.isArray(arr))
              throw new Error(`"${n.objName}" bukan array (baris ${n.line})`);
            const argVals = n.args.map((a) => evalExpr(a, env));
            switch (n.name) {
              case "push":
                arr.push(...argVals);
                break;
              case "pop":
                arr.pop();
                break;
              case "shift":
                arr.shift();
                break;
              case "unshift":
                arr.unshift(...argVals);
                break;
              default:
                throw new Error(
                  `Metode "${n.name}" tidak didukung (baris ${n.line})`,
                );
            }
            pushStep(
              n.id,
              n.line,
              `${n.objName}.${n.name}(${argVals.map(fmt).join(", ")}) → ${n.objName} menjadi ${fmt(arr)}`,
            );
            break;
          }
          case "return": {
            const v = n.expr ? evalExpr(n.expr, env) : undefined;
            pushStep(n.id, n.line, `return${n.expr ? " " + fmt(v) : ""}`);
            throw new ReturnSignal(v);
          }
          case "break": {
            pushStep(n.id, n.line, "break");
            throw new BreakSignal();
          }
          case "continue": {
            pushStep(n.id, n.line, "continue");
            throw new ContinueSignal();
          }
          case "if": {
            const c = evalExpr(n.cond, env);
            pushStep(
              n.id,
              n.line,
              `Kondisi diperiksa: ${c ? 'True → blok "ya"' : 'False → blok "tidak"'}`,
            );
            if (c) execStmts(n.then);
            else if (n.els) execStmts(n.els);
            break;
          }
          case "switch": {
            const v = evalExpr(n.disc, env);
            pushStep(n.id, n.line, `Evaluasi switch: nilai = ${fmt(v)}`);
            let startIdx = -1;
            for (let i = 0; i < n.cases.length; i++) {
              const c = n.cases[i];
              if (c.test !== null && evalExpr(c.test, env) === v) {
                startIdx = i;
                break;
              }
            }
            if (startIdx === -1)
              startIdx = n.cases.findIndex((c) => c.test === null);
            if (startIdx !== -1) {
              try {
                for (let i = startIdx; i < n.cases.length; i++)
                  execStmts(n.cases[i].body);
              } catch (e) {
                if (e instanceof BreakSignal) {
                } else throw e;
              }
            }
            break;
          }
          case "for": {
            if (n.init) execStmt(n.init);
            while (true) {
              const c = evalExpr(n.cond, env);
              pushStep(
                n.id,
                n.line,
                `Cek kondisi loop: ${c ? "True, lanjutkan" : "False, loop berakhir"}`,
              );
              if (!c) break;
              try {
                execStmts(n.body);
              } catch (e) {
                if (e instanceof BreakSignal) {
                  break;
                } else if (e instanceof ContinueSignal) {
                } else throw e;
              }
              if (n.update) execStmt(n.update);
            }
            break;
          }
          case "while": {
            while (true) {
              const c = evalExpr(n.cond, env);
              pushStep(
                n.id,
                n.line,
                `Cek kondisi loop: ${c ? "True, lanjutkan" : "False, loop berakhir"}`,
              );
              if (!c) break;
              try {
                execStmts(n.body);
              } catch (e) {
                if (e instanceof BreakSignal) {
                  break;
                } else if (e instanceof ContinueSignal) {
                } else throw e;
              }
            }
            break;
          }
          case "dowhile": {
            while (true) {
              try {
                execStmts(n.body);
              } catch (e) {
                if (e instanceof BreakSignal) {
                  break;
                } else if (e instanceof ContinueSignal) {
                } else throw e;
              }
              const c = evalExpr(n.cond, env);
              pushStep(
                n.id,
                n.line,
                `Cek kondisi do-while: ${c ? "True, ulangi" : "False, loop berakhir"}`,
              );
              if (!c) break;
            }
            break;
          }
        }
      }
      function interpret(src, lang) {
        nodeId = 1;
        let feed = src;
        if (lang === "python") {
          try {
            feed = transpilePython(src);
          } catch (e) {
            return { fatal: "Kesalahan transpile Python: " + e.message };
          }
        }
        toks = tokenize(feed);
        pos = 0;
        let ast;
        try {
          ast = parseProgram();
        } catch (e) {
          return { fatal: "Kesalahan sintaks: " + e.message };
        }
        env = {};
        steps = [];
        stepCount = 0;
        functions = {};
        ast.forEach((n) => {
          if (n.type === "funcdecl")
            functions[n.name] = { params: n.params, body: n.body };
        });
        let warn = null;
        try {
          execStmts(ast);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            /* return di level atas: hentikan dengan tenang */
          } else if (e instanceof BreakSignal || e instanceof ContinueSignal) {
            if (steps.length === 0)
              return {
                fatal: "break/continue digunakan di luar loop atau switch.",
              };
            warn =
              "Program berhenti: break/continue digunakan di luar loop/switch.";
          } else if (e.message === "__MAXSTEPS__")
            warn =
              "Berhenti otomatis: lebih dari 400 langkah (kemungkinan loop tak berhenti).";
          else {
            if (steps.length === 0)
              return { fatal: "Kesalahan saat eksekusi: " + e.message };
            warn = "Program berhenti karena error: " + e.message;
          }
        }
        return { ast, steps, warn };
      }

      /* ---------- Structogram ---------- */
      function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      }
      function exprStr(n) {
        if (!n) return "";
        switch (n.type) {
          case "lit":
            return typeof n.value === "string"
              ? `"${n.value}"`
              : String(n.value);
          case "var":
            return n.name;
          case "un":
            return `${n.op}${exprStr(n.e)}`;
          case "bin":
            return `${exprStr(n.l)} ${n.op} ${exprStr(n.r)}`;
          case "call":
            return `${n.name}(${n.args.map(exprStr).join(", ")})`;
          case "arrlit":
            return `[${n.elems.map(exprStr).join(", ")}]`;
          case "index":
            return `${exprStr(n.obj)}[${exprStr(n.index)}]`;
          case "member":
            return `${exprStr(n.obj)}.${n.name}`;
          case "methodcall":
            return `${exprStr(n.obj)}.${n.name}(${n.args.map(exprStr).join(", ")})`;
        }
        return "";
      }
      function stmtHeadStr(n) {
        if (n.type === "decl") return `${n.name} = ${exprStr(n.expr)}`;
        if (n.type === "assign") return `${n.name} ${n.op} ${exprStr(n.expr)}`;
        if (n.type === "update") return `${n.name}${n.op}`;
        if (n.type === "indexassign")
          return `${exprStr(n.target)} ${n.op} ${exprStr(n.expr)}`;
        if (n.type === "methodstmt")
          return `${n.objName}.${n.name}(${n.args.map(exprStr).join(", ")})`;
        return "";
      }
      function buildStructogram(list) {
        return list.map(renderNode).join("");
      }
      function renderNode(n) {
        if (
          n.type === "decl" ||
          n.type === "assign" ||
          n.type === "update" ||
          n.type === "indexassign" ||
          n.type === "methodstmt"
        )
          return `<div class="struct-box" data-id="${n.id}">${esc(stmtHeadStr(n))}</div>`;
        if (n.type === "log")
          return `<div class="struct-box" data-id="${n.id}">cetak ${esc(n.args.map(exprStr).join(", "))}</div>`;
        if (n.type === "break")
          return `<div class="struct-box struct-break" data-id="${n.id}">break</div>`;
        if (n.type === "continue")
          return `<div class="struct-box struct-continue" data-id="${n.id}">continue</div>`;
        if (n.type === "if") {
          return `<div class="struct-if"><div class="struct-if-head" data-id="${n.id}">jika (${esc(exprStr(n.cond))})</div>
      <div class="struct-if-branches">
        <div class="struct-branch"><div class="branch-label">ya</div>${buildStructogram(n.then)}</div>
        <div class="struct-branch"><div class="branch-label">tidak</div>${n.els ? buildStructogram(n.els) : '<div class="struct-empty">–</div>'}</div>
      </div></div>`;
        }
        if (n.type === "switch") {
          const cols = n.cases
            .map(
              (c) =>
                `<div class="struct-branch"><div class="branch-label">${c.test === null ? "default" : esc(exprStr(c.test))}</div>${buildStructogram(c.body)}</div>`,
            )
            .join("");
          return `<div class="struct-if"><div class="struct-if-head" data-id="${n.id}">switch (${esc(exprStr(n.disc))})</div><div class="struct-if-branches">${cols}</div></div>`;
        }
        if (n.type === "for" || n.type === "while") {
          const head =
            n.type === "for"
              ? `untuk (${n.init ? esc(stmtHeadStr(n.init)) : ""}; ${esc(exprStr(n.cond))}; ${n.update ? esc(stmtHeadStr(n.update)) : ""})`
              : `selama (${esc(exprStr(n.cond))})`;
          return `<div class="struct-loop"><div class="struct-loop-head" data-id="${n.id}">${head}</div><div class="struct-loop-body">${buildStructogram(n.body)}</div></div>`;
        }
        if (n.type === "dowhile") {
          return `<div class="struct-loop"><div class="struct-loop-body">${buildStructogram(n.body)}</div><div class="struct-loop-head" data-id="${n.id}">lakukan … selama (${esc(exprStr(n.cond))})</div></div>`;
        }
        if (n.type === "funcdecl")
          return `<div class="struct-func"><div class="struct-func-head">function ${esc(n.name)}(${n.params.join(", ")})</div><div class="struct-func-body">${buildStructogram(n.body)}</div></div>`;
        if (n.type === "callstmt")
          return `<div class="struct-box" data-id="${n.id}">panggil ${esc(n.name)}(${n.args.map(exprStr).join(", ")})</div>`;
        if (n.type === "return")
          return `<div class="struct-box" data-id="${n.id}">kembalikan ${n.expr ? esc(exprStr(n.expr)) : ""}</div>`;
        return "";
      }

      /* ---------- Flowchart ---------- */
      function buildFlowchart(list) {
        let html = '<div class="flow-pill">Start</div>';
        html += buildFlowSeq(list);
        html +=
          '<div class="flow-arrow">↓</div><div class="flow-pill">End</div>';
        return html;
      }
      function buildFlowSeq(list) {
        return list.map(renderFlowNode).join("");
      }
      function renderFlowNode(n) {
        if (n.type === "funcdecl") return "";
        if (
          n.type === "decl" ||
          n.type === "assign" ||
          n.type === "update" ||
          n.type === "indexassign" ||
          n.type === "methodstmt"
        )
          return `<div class="flow-arrow">↓</div><div class="flow-box" data-id="${n.id}">${esc(stmtHeadStr(n))}</div>`;
        if (n.type === "log")
          return `<div class="flow-arrow">↓</div><div class="flow-box" data-id="${n.id}">cetak ${esc(n.args.map(exprStr).join(", "))}</div>`;
        if (n.type === "callstmt")
          return `<div class="flow-arrow">↓</div><div class="flow-box" data-id="${n.id}">panggil ${esc(n.name)}(${n.args.map(exprStr).join(", ")})</div>`;
        if (n.type === "return")
          return `<div class="flow-arrow">↓</div><div class="flow-box" data-id="${n.id}">kembalikan ${n.expr ? esc(exprStr(n.expr)) : ""}</div>`;
        if (n.type === "break")
          return `<div class="flow-arrow">↓</div><div class="flow-box" data-id="${n.id}" style="border-left:3px solid var(--err);">break</div>`;
        if (n.type === "continue")
          return `<div class="flow-arrow">↓</div><div class="flow-box" data-id="${n.id}" style="border-left:3px solid var(--accent2);">continue</div>`;
        if (n.type === "if") {
          return `<div class="flow-arrow">↓</div><div class="flow-diamond" data-id="${n.id}">jika (${esc(exprStr(n.cond))})</div>
      <div class="flow-branches">
        <div class="flow-col"><div class="flow-label">ya ↓</div>${buildFlowSeq(n.then)}</div>
        <div class="flow-col"><div class="flow-label">tidak ↓</div>${n.els ? buildFlowSeq(n.els) : '<div class="flow-empty">–</div>'}</div>
      </div><div class="flow-merge">↓ (gabung)</div>`;
        }
        if (n.type === "switch") {
          const cols = n.cases
            .map(
              (c) =>
                `<div class="flow-col"><div class="flow-label">${c.test === null ? "default" : esc(exprStr(c.test))} ↓</div>${buildFlowSeq(c.body)}</div>`,
            )
            .join("");
          return `<div class="flow-arrow">↓</div><div class="flow-diamond" data-id="${n.id}">switch (${esc(exprStr(n.disc))})</div><div class="flow-branches">${cols}</div><div class="flow-merge">↓ (gabung)</div>`;
        }
        if (n.type === "for" || n.type === "while") {
          const label = `cek: ${esc(exprStr(n.cond))}`;
          return `<div class="flow-arrow">↓</div><div class="flow-diamond" data-id="${n.id}">${label}</div>
      <div class="flow-loopbody">${buildFlowSeq(n.body)}<div class="flow-loopback">⟲ kembali ke pengecekan kondisi</div></div>
      <div class="flow-merge">↓ (loop selesai)</div>`;
        }
        if (n.type === "dowhile") {
          return `<div class="flow-arrow">↓</div><div class="flow-loopbody">${buildFlowSeq(n.body)}</div>
      <div class="flow-arrow">↓</div><div class="flow-diamond" data-id="${n.id}">cek: ${esc(exprStr(n.cond))}</div>
      <div class="flow-loopback">⟲ jika true, ulangi dari atas</div><div class="flow-merge">↓ (selesai jika false)</div>`;
        }
        return "";
      }

      /* ---------- Syntax highlight (separate from the parser's lexer: never throws) ---------- */
      const HL_KWS = new Set([
        "let",
        "const",
        "var",
        "if",
        "else",
        "for",
        "while",
        "do",
        "switch",
        "case",
        "default",
        "break",
        "continue",
        "console",
        "true",
        "false",
        "function",
        "return",
      ]);
      const HL_KWS_PY = new Set([
        "def",
        "return",
        "if",
        "elif",
        "else",
        "for",
        "in",
        "range",
        "while",
        "print",
        "True",
        "False",
        "None",
        "and",
        "or",
        "not",
        "break",
        "continue",
        "pass",
        "len",
      ]);
      function highlightCode(src) {
        const isPy = currentLang === "python";
        const kwSet = isPy ? HL_KWS_PY : HL_KWS;
        let out = "";
        let i = 0;
        const n = src.length;
        while (i < n) {
          const c = src[i];
          if (c === "\n") {
            out += "\n";
            i++;
            continue;
          }
          if (/[ \t]/.test(c)) {
            out += c;
            i++;
            continue;
          }
          if (isPy && c === "#") {
            let j = i;
            while (j < n && src[j] !== "\n") j++;
            out += `<span class="tok-cm">${esc(src.slice(i, j))}</span>`;
            i = j;
            continue;
          }
          if (!isPy && c === "/" && src[i + 1] === "/") {
            let j = i;
            while (j < n && src[j] !== "\n") j++;
            out += `<span class="tok-cm">${esc(src.slice(i, j))}</span>`;
            i = j;
            continue;
          }
          if (c === '"' || c === "'") {
            const q = c;
            let j = i + 1;
            while (j < n && src[j] !== q && src[j] !== "\n") j++;
            if (src[j] === q) j++;
            out += `<span class="tok-str">${esc(src.slice(i, j))}</span>`;
            i = j;
            continue;
          }
          if (/[0-9]/.test(c)) {
            let j = i;
            while (j < n && /[0-9.]/.test(src[j])) j++;
            out += `<span class="tok-num">${esc(src.slice(i, j))}</span>`;
            i = j;
            continue;
          }
          if (/[A-Za-z_$]/.test(c)) {
            let j = i;
            while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
            const w = src.slice(i, j);
            out += kwSet.has(w)
              ? `<span class="tok-kw">${esc(w)}</span>`
              : `<span class="tok-id">${esc(w)}</span>`;
            i = j;
            continue;
          }
          if ("+-*/%<>=!&|".includes(c)) {
            let j = i + 1;
            while (j < n && "+-*/%<>=!&|".includes(src[j])) j++;
            out += `<span class="tok-op">${esc(src.slice(i, j))}</span>`;
            i = j;
            continue;
          }
          out += `<span class="tok-pn">${esc(c)}</span>`;
          i++;
        }
        if (src.endsWith("\n")) out += " ";
        return out;
      }

      /* ---------- UI wiring ---------- */
      const editor = document.getElementById("editor"),
        editorHl = document.getElementById("editorHl"),
        errbox = document.getElementById("errbox"),
        warnbox = document.getElementById("warnbox");
      const codeview = document.getElementById("codeview"),
        structogram = document.getElementById("structogram");
      const varrow = document.getElementById("varrow"),
        traceHead = document.getElementById("traceHead"),
        traceBody = document.getElementById("traceBody");
      const flowchart = document.getElementById("flowchart");
      const narration = document.getElementById("narration"),
        outputEl = document.getElementById("output");
      const bar = document.getElementById("bar"),
        stepinfo = document.getElementById("stepinfo"),
        bpinfo = document.getElementById("bpinfo");
      const stepControls = document.getElementById("stepControls"),
        progressWrap = document.getElementById("progressWrap");
      let curSteps = [],
        curVarNames = [],
        current = -1,
        playTimer = null,
        srcLines = [];
      let breakpoints = new Set();
      let currentLang = "javascript";

      const SAMPLE_LABELS = {
        var: "Variabel &amp; Menampilkan",
        arr: "Array",
        if: "Percabangan (switch)",
        ifsimple: "Percabangan: if",
        ifelseif: "Percabangan: if / else if",
        ifelseifelse: "Percabangan: if / else if / else",
        loop: "Perulangan",
        rec: "Rekursi",
        nest: "Nested Percabangan &amp; Perulangan",
      };
      function populateSampleSelect(lang) {
        const src = lang === "python" ? SAMPLES_PY : SAMPLES;
        const sel = document.getElementById("sampleSelect");
        sel.innerHTML =
          '<option value="">Contoh…</option>' +
          Object.keys(src)
            .map(
              (k) =>
                `<option value="${k}">${SAMPLE_LABELS[k] || k}</option>`,
            )
            .join("");
      }
      populateSampleSelect(currentLang);
      document.getElementById("langSelect").onchange = function () {
        currentLang = this.value;
        populateSampleSelect(currentLang);
        const src = currentLang === "python" ? SAMPLES_PY : SAMPLES;
        editor.value = src.var || Object.values(src)[0] || "";
        updateHighlight();
        errbox.style.display = "none";
        warnbox.style.display = "none";
      };

      function updateHighlight() {
        editorHl.innerHTML = highlightCode(editor.value);
      }
      editor.addEventListener("input", updateHighlight);
      editor.addEventListener("scroll", () => {
        editorHl.scrollTop = editor.scrollTop;
        editorHl.scrollLeft = editor.scrollLeft;
      });

      editor.value = SAMPLES.arr;
      updateHighlight();

      editor.addEventListener("keydown", function (e) {
        const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
        const closers = Object.values(pairs);
        const start = this.selectionStart,
          end = this.selectionEnd,
          val = this.value;

        if (e.key === "Tab") {
          e.preventDefault();
          this.setRangeText("  ", start, end, "end");
          updateHighlight();
          return;
        }

        if (pairs[e.key] !== undefined) {
          e.preventDefault();
          if (start !== end) {
            const sel = val.slice(start, end);
            this.setRangeText(e.key + sel + pairs[e.key], start, end, "start");
            this.selectionStart = start + 1;
            this.selectionEnd = end + 1 + sel.length;
            updateHighlight();
            return;
          }
          this.setRangeText(e.key + pairs[e.key], start, end, "start");
          this.selectionStart = this.selectionEnd = start + 1;
          updateHighlight();
          return;
        }
        if (closers.includes(e.key) && val[start] === e.key && start === end) {
          e.preventDefault();
          this.selectionStart = this.selectionEnd = start + 1;
          return;
        }
        if (e.key === "Backspace" && start === end && start > 0) {
          const before = val[start - 1],
            after = val[start];
          if (pairs[before] === after) {
            e.preventDefault();
            this.setRangeText("", start - 1, start + 1, "start");
            updateHighlight();
            return;
          }
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const lineStart = val.lastIndexOf("\n", start - 1) + 1;
          const curLine = val.slice(lineStart, start);
          const indent = (curLine.match(/^[ \t]*/) || [""])[0];
          const before = val[start - 1],
            after = val[start];
          if ("{[(".includes(before) && pairs[before] === after) {
            const full = "\n" + indent + "  " + "\n" + indent;
            this.setRangeText(full, start, end, "start");
            this.selectionStart = this.selectionEnd =
              start + 1 + indent.length + 2;
            updateHighlight();
            return;
          }
          const extra = "{[(".includes(before) ? "  " : "";
          this.setRangeText("\n" + indent + extra, start, end, "end");
          updateHighlight();
        }
      });

      document.getElementById("sampleSelect").onchange = function () {
        const v = this.value;
        const src = currentLang === "python" ? SAMPLES_PY : SAMPLES;
        if (v && src[v]) {
          editor.value = src[v];
          updateHighlight();
        }
      };
      document.getElementById("btnRun").onclick = runNow;
      document.querySelectorAll(".panel-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".panel-tab")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          document.getElementById("analysisGrid").dataset.active =
            btn.dataset.target;
        });
      });
      document.getElementById("btnClear").onclick = () => {
        editor.value = "";
        updateHighlight();
        errbox.style.display = "none";
        warnbox.style.display = "none";
        editor.focus();
      };
      document.getElementById("btnEdit").onclick = () => {
        stopPlay();
        codeview.style.display = "none";
        bpinfo.style.display = "none";
        stepControls.style.display = "none";
        progressWrap.style.display = "none";
        stepinfo.textContent = "";
        document.querySelector(".editor-wrap").style.display = "block";
        document.getElementById("btnRun").style.display = "inline-block";
        document.getElementById("sampleSelect").style.display = "inline-block";
      };
      document.getElementById("btnNext").onclick = () => {
        if (current < curSteps.length - 1) {
          current++;
          render();
        }
        if (current >= curSteps.length - 1) stopPlay();
      };
      document.getElementById("btnPrev").onclick = () => {
        if (current > -1) {
          current--;
          render();
        }
      };
      document.getElementById("btnReset").onclick = () => {
        stopPlay();
        current = -1;
        render();
      };
      const ICON_PLAY =
        '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6V4z"/></svg>';
      const ICON_PAUSE =
        '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="4" width="3.4" height="12" rx="1"/><rect x="11.6" y="4" width="3.4" height="12" rx="1"/></svg>';
      document.getElementById("btnPlay").onclick = () => {
        const b = document.getElementById("btnPlay");
        if (playTimer) {
          stopPlay();
          return;
        }
        b.innerHTML = ICON_PAUSE + "<span>Jeda</span>";
        playTimer = setInterval(() => {
          if (current < curSteps.length - 1) {
            current++;
            render();
            if (breakpoints.has(curSteps[current].line)) stopPlay();
          } else stopPlay();
        }, 1100);
      };
      function stopPlay() {
        clearInterval(playTimer);
        playTimer = null;
        const b = document.getElementById("btnPlay");
        if (b) b.innerHTML = ICON_PLAY + "<span>Auto</span>";
      }

      function runNow() {
        errbox.style.display = "none";
        warnbox.style.display = "none";
        const src = editor.value;
        let result;
        try {
          result = interpret(src, currentLang);
        } catch (e) {
          result = { fatal: "Kesalahan tak terduga: " + e.message };
        }
        if (result.fatal) {
          errbox.textContent = result.fatal;
          errbox.style.display = "block";
          return;
        }
        curSteps = result.steps;
        if (curSteps.length === 0) {
          errbox.textContent =
            "Program tidak menghasilkan langkah eksekusi (kode kosong?).";
          errbox.style.display = "block";
          return;
        }
        if (result.warn) {
          warnbox.textContent = result.warn;
          warnbox.style.display = "block";
        }

        structogram.innerHTML = buildStructogram(result.ast);
        flowchart.innerHTML = buildFlowchart(result.ast);
        srcLines = src.split("\n");
        breakpoints = new Set();
        codeview.innerHTML = srcLines
          .map(
            (l, idx) =>
              `<div class="codeline" id="cvln${idx + 1}"><span class="ln" data-line="${idx + 1}">${idx + 1}</span><span>${highlightCode(l)}</span></div>`,
          )
          .join("");
        codeview.querySelectorAll(".ln").forEach((el) => {
          el.onclick = () => {
            const ln = Number(el.dataset.line);
            const row = el.closest(".codeline");
            if (breakpoints.has(ln)) {
              breakpoints.delete(ln);
              row.classList.remove("bp");
            } else {
              breakpoints.add(ln);
              row.classList.add("bp");
            }
          };
        });

        const varSet = new Set();
        curSteps.forEach((s) => {
          for (const k in s.vars) varSet.add(k);
        });
        curVarNames = [...varSet];
        varrow.innerHTML = curVarNames
          .map(
            (v) =>
              `<div class="varbox" id="box_${v}"><div class="label">${esc(v)}</div><div class="value" id="val_${v}">–</div></div>`,
          )
          .join("");
        traceHead.innerHTML =
          curVarNames.map((v) => `<th>${esc(v)}</th>`).join("") +
          "<th>status</th>";

        document.querySelector(".editor-wrap").style.display = "none";
        document.getElementById("btnRun").style.display = "none";
        document.getElementById("sampleSelect").style.display = "none";
        codeview.style.display = "block";
        bpinfo.style.display = "block";
        stepControls.style.display = "flex";
        progressWrap.style.display = "block";
        current = -1;
        render();
      }

      function render() {
        document
          .querySelectorAll(".codeline")
          .forEach((el) => el.classList.remove("active"));
        document
          .querySelectorAll("[data-id]")
          .forEach((el) => el.classList.remove("active"));
        curVarNames.forEach((v) => {
          const b = document.getElementById("box_" + v);
          if (b) b.classList.remove("pulse");
        });

        if (current >= 0) {
          const step = curSteps[current];
          const cv = document.getElementById("cvln" + step.line);
          if (cv) {
            cv.classList.add("active");
            cv.scrollIntoView({ block: "nearest" });
          }
          document
            .querySelectorAll(`[data-id="${step.id}"]`)
            .forEach((el) => el.classList.add("active"));

          curVarNames.forEach((v) => {
            const val = document.getElementById("val_" + v);
            const has = v in step.vars;
            val.innerHTML = has ? fmtHTML(step.vars[v]) : "–";
            const prev =
              current > 0 ? curSteps[current - 1].vars[v] : undefined;
            if (has && JSON.stringify(step.vars[v]) !== JSON.stringify(prev))
              document.getElementById("box_" + v).classList.add("pulse");
          });

          const row = document.createElement("tr");
          const statusHtml =
            step.output !== null
              ? '<svg viewBox="0 0 20 20" fill="none" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;"><path d="M4 10l4 4 8-9" stroke="var(--ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>cetak'
              : "berjalan…";
          row.innerHTML =
            curVarNames
              .map((v) =>
                v in step.vars
                  ? `<td>${fmtHTML(step.vars[v])}</td>`
                  : "<td>–</td>",
              )
              .join("") + `<td>${statusHtml}</td>`;
          traceBody.innerHTML = "";
          traceBody.appendChild(row);

          narration.textContent = step.note;
          const outs = curSteps
            .slice(0, current + 1)
            .filter((s) => s.output !== null)
            .map((s) => s.output);
          outputEl.textContent = outs.length
            ? outs.join("\n")
            : "(belum ada output)";
          outputEl.style.color = outs.length ? "var(--syn-ok)" : "";
          stepinfo.textContent = `Langkah ${current + 1} / ${curSteps.length}`;
          bar.style.width = ((current + 1) / curSteps.length) * 100 + "%";
        } else {
          traceBody.innerHTML = "";
          narration.textContent =
            'Tekan "Lanjut" untuk mulai menelusuri eksekusi.';
          outputEl.textContent = "(belum ada output)";
          outputEl.style.color = "";
          stepinfo.textContent = `Langkah 0 / ${curSteps.length}`;
          bar.style.width = "0%";
        }
        document.getElementById("btnPrev").disabled = current <= -1;
        document.getElementById("btnNext").disabled =
          current >= curSteps.length - 1;
      }