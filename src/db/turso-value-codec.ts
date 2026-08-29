import type {
	ColumnUpdateNode,
	InsertQueryNode,
	KyselyPlugin,
	OperationNode,
	PluginTransformQueryArgs,
	PluginTransformResultArgs,
	PrimitiveValueListNode,
	QueryResult,
	UnknownRow,
	ValueNode,
} from "kysely";
import {
	AliasNode as AliasNodeFactory,
	ColumnNode as ColumnNodeFactory,
	OperationNodeTransformer,
	PrimitiveValueListNode as PrimitiveValueListNodeFactory,
	ValueListNode as ValueListNodeFactory,
	ValueNode as ValueNodeFactory,
	ValuesNode as ValuesNodeFactory,
} from "kysely";

type JsonInputCodec = "json" | "stringArray";
type ResultCodec = JsonInputCodec | "timestamp" | "boolean";

const jsonInputColumns: Record<string, JsonInputCodec> = {
	mdast_json: "json",
	target_locales: "stringArray",
};

const dateResultColumns = new Set([
	"accessTokenExpiresAt",
	"archivedAt",
	"createdAt",
	"expiresAt",
	"finishedAt",
	"lastReplyAt",
	"lastUsedAt",
	"publishedAt",
	"refreshTokenExpiresAt",
	"startedAt",
	"updatedAt",
	"pageCreatedAt",
	"pageUpdatedAt",
	"translationJobCreatedAt",
	"translationJobUpdatedAt",
	"userCreatedAt",
	"userUpdatedAt",
]);

const booleanResultColumns = new Set([
	"currentUserVoteIsUpvote",
	"emailVerified",
	"isAI",
	"isAi",
	"isDeleted",
	"isUpvote",
	"ownerUpvote",
	"read",
	"userIsAi",
]);

const resultCodecs = new Map<string, ResultCodec>([
	["mdastJson", "json"],
	["targetLocales", "stringArray"],
	...[...dateResultColumns].map((column) => [column, "timestamp"] as const),
	...[...booleanResultColumns].map((column) => [column, "boolean"] as const),
]);

function getColumnName(node: OperationNode | undefined): string | undefined {
	if (!node) return undefined;
	if (ColumnNodeFactory.is(node)) return node.column.name;
	if (AliasNodeFactory.is(node)) return getColumnName(node.node);
	return undefined;
}

function encodeJsonValue(codec: JsonInputCodec, value: unknown): unknown {
	if (codec === "stringArray") {
		if (
			!Array.isArray(value) ||
			!value.every((item) => typeof item === "string")
		) {
			throw new TypeError("targetLocales must be an array of strings");
		}
	}
	return JSON.stringify(value);
}

function markValue(
	value: OperationNode | undefined,
	codec: JsonInputCodec | undefined,
	nodeCodecs: WeakMap<object, JsonInputCodec>,
	primitiveCodecs: WeakMap<object, ReadonlyMap<number, JsonInputCodec>>,
): void {
	if (!codec || !value) return;
	if (ValueNodeFactory.is(value)) {
		nodeCodecs.set(value, codec);
		return;
	}
	if (PrimitiveValueListNodeFactory.is(value)) {
		primitiveCodecs.set(
			value,
			new Map(value.values.map((_item, index) => [index, codec])),
		);
		return;
	}
	if (ValueListNodeFactory.is(value)) {
		for (const item of value.values) {
			if (item.kind === "ValueNode") {
				nodeCodecs.set(item, codec);
			}
		}
	}
}

function markInsertValues(
	node: InsertQueryNode,
	nodeCodecs: WeakMap<object, JsonInputCodec>,
	primitiveCodecs: WeakMap<object, ReadonlyMap<number, JsonInputCodec>>,
): void {
	if (!node.values || !ValuesNodeFactory.is(node.values) || !node.columns)
		return;
	const codecs = node.columns.map(
		(column) => jsonInputColumns[column.column.name],
	);
	for (const row of node.values.values) {
		if (PrimitiveValueListNodeFactory.is(row)) {
			const rowCodecs = new Map<number, JsonInputCodec>();
			for (const [index, codec] of codecs.entries()) {
				if (codec) rowCodecs.set(index, codec);
			}
			if (rowCodecs.size > 0) primitiveCodecs.set(row, rowCodecs);
			continue;
		}
		if (!ValueListNodeFactory.is(row)) continue;
		for (const [index, codec] of codecs.entries()) {
			markValue(row.values[index], codec, nodeCodecs, primitiveCodecs);
		}
	}
}

class InputCodecTransformer extends OperationNodeTransformer {
	private readonly nodeCodecs = new WeakMap<object, JsonInputCodec>();
	private readonly primitiveCodecs = new WeakMap<
		object,
		ReadonlyMap<number, JsonInputCodec>
	>();

	protected override transformInsertQuery(
		node: InsertQueryNode,
		queryId?: { readonly queryId: string },
	): InsertQueryNode {
		markInsertValues(node, this.nodeCodecs, this.primitiveCodecs);
		return super.transformInsertQuery(node, queryId);
	}

	protected override transformColumnUpdate(
		node: ColumnUpdateNode,
		queryId?: { readonly queryId: string },
	): ColumnUpdateNode {
		const codec = jsonInputColumns[getColumnName(node.column) ?? ""];
		markValue(node.value, codec, this.nodeCodecs, this.primitiveCodecs);
		return super.transformColumnUpdate(node, queryId);
	}

	protected override transformValue(node: ValueNode): ValueNode {
		const codec = this.nodeCodecs.get(node);
		return codec
			? ValueNodeFactory.create(encodeJsonValue(codec, node.value))
			: node;
	}

	protected override transformPrimitiveValueList(
		node: PrimitiveValueListNode,
	): PrimitiveValueListNode {
		const codecs = this.primitiveCodecs.get(node);
		if (!codecs) return node;
		return PrimitiveValueListNodeFactory.create(
			node.values.map((value, index) => {
				const codec = codecs.get(index);
				return codec ? encodeJsonValue(codec, value) : value;
			}),
		);
	}
}

function decodeTimestamp(value: unknown): unknown {
	if (value === null || value instanceof Date) return value;
	const milliseconds =
		typeof value === "number" || typeof value === "bigint"
			? Number(value)
			: typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)
				? Number(value)
				: Number.NaN;
	const date = Number.isFinite(milliseconds)
		? new Date(milliseconds)
		: typeof value === "string"
			? new Date(value)
			: undefined;
	if (!date || Number.isNaN(date.valueOf())) {
		throw new TypeError(`Invalid SQLite timestamp: ${String(value)}`);
	}
	return date;
}

function decodeBoolean(value: unknown): unknown {
	if (value === null || typeof value === "boolean") return value;
	if (value === 0 || value === 0n || value === "0") return false;
	if (value === 1 || value === 1n || value === "1") return true;
	throw new TypeError(`Invalid SQLite boolean: ${String(value)}`);
}

function decodeJson(value: unknown, column: string): unknown {
	if (value === null || typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new TypeError(`Invalid JSON in ${column}`, { cause: error });
	}
}

function decodeValue(
	codec: ResultCodec,
	value: unknown,
	column: string,
): unknown {
	switch (codec) {
		case "timestamp":
			return decodeTimestamp(value);
		case "boolean":
			return decodeBoolean(value);
		case "json":
			return decodeJson(value, column);
		case "stringArray": {
			const decoded = decodeJson(value, column);
			if (
				!Array.isArray(decoded) ||
				!decoded.every((item) => typeof item === "string")
			) {
				throw new TypeError(`Invalid string[] in ${column}`);
			}
			return decoded;
		}
	}
}

export class TursoValueCodecPlugin implements KyselyPlugin {
	transformQuery({ node, queryId }: PluginTransformQueryArgs) {
		return new InputCodecTransformer().transformNode(node, queryId);
	}

	async transformResult({
		result,
	}: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
		return {
			...result,
			rows: result.rows.map((row) => {
				const decoded: UnknownRow = { ...row };
				for (const [column, codec] of resultCodecs) {
					if (column in decoded) {
						decoded[column] = decodeValue(codec, decoded[column], column);
					}
				}
				return decoded;
			}),
		};
	}
}
