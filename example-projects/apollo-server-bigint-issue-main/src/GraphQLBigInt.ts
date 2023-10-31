import { GraphQLError, GraphQLScalarType, Kind, print } from 'graphql';

function toBigInt(value: string | number | bigint) {
  try {
    return BigInt(value);
  } catch (e) {
    throw new GraphQLError(`BigInt cannot represent value: ${value}`);
  }
}

function parseValue(value: unknown) {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'bigint'
  ) {
    throw new GraphQLError(`BigInt cannot represent value: ${value}`);
  }
  return toBigInt(value);
}

const GraphQLBigInt = new GraphQLScalarType({
  name: 'BigInt',
  description:
    'The `BigInt` scalar type represents non-fractional signed whole numeric values which are too large to be represented by the `Int` and `Long` scalars.',
  serialize: parseValue,
  parseValue,
  parseLiteral(valueNode) {
    if (valueNode.kind !== Kind.INT) {
      throw new GraphQLError(
        `BigInt cannot represent value: ${print(valueNode)}`,
        { nodes: valueNode }
      );
    }
    return toBigInt(valueNode.value);
  },
});

export default GraphQLBigInt;
