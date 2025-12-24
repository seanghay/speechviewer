import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import Knex from "knex";

export async function createApp(datasetPath, dbPath) {
	const knex = Knex({
		client: "better-sqlite3",
		connection: {
			filename: dbPath,
		},
		useNullAsDefault: true,
	});

	const Change = () => knex("changes");

	if (!(await knex.schema.hasTable("changes"))) {
		await knex.schema.createTable("changes", (t) => {
			t.increments("id").primary();
			t.string("filename", 1024).unique().notNullable();
			t.string("text", 2048).notNullable();
			t.string("status", 16).defaultTo("normal").notNullable();
			t.timestamps(true, true);
		});
	}

	async function readMetadata(datasetDir) {
		const metadataFile = path.join(datasetDir, "metadata.tsv");
		const metadata = await fs.readFile(metadataFile, "utf8");
		const values = metadata
			.split(/[\n\r]+/)
			.map((row) => row.split("\t").slice(0, 2));
		return values;
	}

	// http server
	const app = express();

	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(cors());

	app.use("/api/static", express.static(datasetPath));

	app.post("/api/update", async (req, res) => {
		const { text, filename, status } = req.body;

		const currentItem = await Change().where("filename", filename).first();

		if (currentItem == null) {
			const ids = await Change().insert({
				text,
				filename,
				status,
			});

			res.json(await Change().where("id", ids[0]).first());
			return;
		}

		await Change()
			.update({
				text,
				filename,
				status,
				updated_at: knex.fn.now(),
			})
			.where("id", currentItem.id);

		res.json(await Change().where("id", currentItem.id).first());
	});

	app.get("/api/values", async (req, res) => {
		const changes = await Change();
		const map = new Map(changes.map((change) => [change.filename, change]));

		const values = [];
		const data = await readMetadata(datasetPath);

		for (const item of data) {
			const file = path.join("api", "static", "wavs", item[0]);
			if (map.has(item[0])) {
				values.push({
					...map.get(item[0]),
					file,
					text_src: item[1],
				});
				continue;
			}

			values.push({
				filename: item[0],
				file,
				text: item[1],
			});
		}

		res.json(values);
	});

	app.get("/api/summary", async (req, res) => {
		const data = await readMetadata(datasetPath);

		const changes = await Change()
			.groupBy("status")
			.select("status")
			.count("* as total");

		const remaining =
			data.length - changes.reduce((prev, cur) => prev + cur.total, 0);

		res.json({
			total: data.length,
			...Object.fromEntries(changes.map((item) => [item.status, item.total])),
			remaining,
		});
	});

	return app;
}
