import {
  type AccessorNode,
  all,
  create,
  isAccessorNode,
  isConstantNode,
  isFunctionNode,
  isIndexNode,
  isOperatorNode,
  isParenthesisNode,
  isSymbolNode,
  type MathNode,
} from 'mathjs';

export interface FormulaScope {
  base_price: number;
  cost: number;
  quantity: number;
  variant: Record<string, number>;
  option: Record<string, number>;
}

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

const math = create(all ?? {}, { number: 'number', predictable: true });

math.import({ ln: math.log }, { override: true });

const ALLOWED_OPERATORS = new Set(['+', '-', '*', '/', '^', '%']);
const ALLOWED_CONSTANTS = new Set(['e', 'pi', 'tau']);
const ALLOWED_FUNCTIONS = new Set([
  'abs',
  'ceil',
  'cbrt',
  'exp',
  'floor',
  'ln',
  'log',
  'log10',
  'log2',
  'max',
  'min',
  'pow',
  'round',
  'sign',
  'sqrt',
]);
const SCALAR_SYMBOLS = new Set(['base_price', 'cost', 'quantity']);

function assertAccessor(node: AccessorNode, scope: FormulaScope): void {
  const group = isSymbolNode(node.object) ? node.object.name : '';
  const dimension = isIndexNode(node.index) ? node.index.dimensions[0] : undefined;
  const key = dimension && isConstantNode(dimension) ? dimension.value : undefined;

  const members = group === 'variant' || group === 'option' ? scope[group] : undefined;

  if (!members || typeof key !== 'string' || !Object.hasOwn(members, key)) {
    throw new FormulaError('Variable no disponible en la fórmula');
  }
}

function assertSymbol(name: string): void {
  if (!SCALAR_SYMBOLS.has(name) && !ALLOWED_CONSTANTS.has(name)) {
    throw new FormulaError(`Variable no disponible en la fórmula: "${name}"`);
  }
}

function assertFunction(fn: MathNode): void {
  if (!isSymbolNode(fn) || !ALLOWED_FUNCTIONS.has(fn.name)) {
    throw new FormulaError('Función no permitida en la fórmula');
  }
}

type NodeCheck = (node: MathNode, scope: FormulaScope) => boolean;

function checkConstant(node: MathNode): boolean {
  if (!isConstantNode(node)) {
    return false;
  }
  if (typeof node.value !== 'number' || !Number.isFinite(node.value)) {
    throw new FormulaError('Solo se permiten números en la fórmula');
  }
  return true;
}

function checkSymbol(node: MathNode): boolean {
  if (!isSymbolNode(node)) {
    return false;
  }
  assertSymbol(node.name);
  return true;
}

function checkAccessor(node: MathNode, scope: FormulaScope): boolean {
  if (!isAccessorNode(node)) {
    return false;
  }
  assertAccessor(node, scope);
  return true;
}

function checkParenthesis(node: MathNode, scope: FormulaScope): boolean {
  if (!isParenthesisNode(node)) {
    return false;
  }
  assertNode(node.content, scope);
  return true;
}

function checkOperator(node: MathNode, scope: FormulaScope): boolean {
  if (!isOperatorNode(node)) {
    return false;
  }
  if (!ALLOWED_OPERATORS.has(node.op)) {
    throw new FormulaError(`Operador no permitido en la fórmula: "${node.op}"`);
  }
  assertChildren(node.args, scope);
  return true;
}

function checkFunction(node: MathNode, scope: FormulaScope): boolean {
  if (!isFunctionNode(node)) {
    return false;
  }
  assertFunction(node.fn);
  assertChildren(node.args, scope);
  return true;
}

const NODE_CHECKS: NodeCheck[] = [
  checkConstant,
  checkSymbol,
  checkAccessor,
  checkParenthesis,
  checkOperator,
  checkFunction,
];

// Whitelist walk: anything not explicitly handled (assignments, blocks, arrays,
// ranges, strings, ...) is rejected before the expression is ever evaluated.
function assertNode(node: MathNode, scope: FormulaScope): void {
  if (!NODE_CHECKS.some((check) => check(node, scope))) {
    throw new FormulaError('Elemento no permitido en la fórmula');
  }
}

function assertChildren(nodes: MathNode[], scope: FormulaScope): void {
  for (const child of nodes) {
    assertNode(child, scope);
  }
}

export function evaluateFormula(formula: string, scope: FormulaScope): number {
  let node: MathNode;

  try {
    node = math.parse(formula);
  } catch {
    throw new FormulaError('Error de sintaxis en la fórmula');
  }

  assertNode(node, scope);

  const result = node.compile().evaluate({ ...scope });

  if (typeof result !== 'number' || !Number.isFinite(result) || result < 0) {
    throw new FormulaError('La fórmula produjo un resultado inválido');
  }

  return result;
}
