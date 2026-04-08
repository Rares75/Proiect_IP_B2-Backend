import PrettyError from "pretty-error";

const pe = new PrettyError().start().withColors();

process.on("uncaughtException", (err) => {
	console.error(pe.render(err));
});

export default pe;
