import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import {
	expectApiEnvelope,
	expectServerErrorApiResponse,
	expectSuccessApiResponse,
} from "./apiResponseAssertions";

mock.module("../../src/utils/controller", () => ({
	Controller: () => (_target: unknown) => {},
}));

const { UploadController } = await import(
	"../../src/controllers/UploadController"
);

type EndpointCase = {
	path: "/avatar" | "/image" | "/audio";
	methodName: "uploadAvatar" | "uploadImage" | "uploadAudioFile";
	expectedUrl: string;
};

const endpointCases: EndpointCase[] = [
	{
		path: "/avatar",
		methodName: "uploadAvatar",
		expectedUrl: "https://cdn.example.com/avatars/avatar.png",
	},
	{
		path: "/image",
		methodName: "uploadImage",
		expectedUrl: "https://cdn.example.com/images/image.png",
	},
	{
		path: "/audio",
		methodName: "uploadAudioFile",
		expectedUrl: "https://cdn.example.com/audio/sound.mp3",
	},
];

const makeForm = (name: string, contentType: string) => {
	const formData = new FormData();
	formData.append(
		"file",
		new File(["dummy-file-content"], name, { type: contentType }),
	);
	return formData;
};

describe("UploadController", () => {
	let app: Hono;
	let mockService: {
		uploadAvatar: ReturnType<typeof mock>;
		uploadImage: ReturnType<typeof mock>;
		uploadAudioFile: ReturnType<typeof mock>;
	};

	beforeEach(() => {
		mockService = {
			uploadAvatar: mock(
				async () => "https://cdn.example.com/avatars/default.png",
			),
			uploadImage: mock(
				async () => "https://cdn.example.com/images/default.png",
			),
			uploadAudioFile: mock(
				async () => "https://cdn.example.com/audio/default.mp3",
			),
		};

		const controller = new UploadController(mockService as any);
		app = new Hono();
		app.route("/uploads", controller.controller);
	});

	test.each(
		endpointCases,
	)("returns 200 and uploaded URL for POST /uploads$path", async ({
		path,
		methodName,
		expectedUrl,
	}) => {
		mockService[methodName] = mock(async () => expectedUrl);
		const controller = new UploadController(mockService as any);
		app = new Hono();
		app.route("/uploads", controller.controller);

		const response = await app.request(`http://localhost/uploads${path}`, {
			method: "POST",
			body: makeForm(
				path === "/audio" ? "sound.mp3" : `${path.slice(1)}.png`,
				path === "/audio" ? "audio/mpeg" : "image/png",
			),
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expectApiEnvelope(body, 200);
		expectSuccessApiResponse(body, expectedUrl, 200);
		expect(mockService[methodName]).toHaveBeenCalledTimes(1);
		expect(mockService[methodName]).toHaveBeenCalledWith(expect.any(File));
	});

	test.each(
		endpointCases,
	)("returns 500 when service fails for POST /uploads$path", async ({
		path,
		methodName,
	}) => {
		mockService[methodName] = mock(async () => {
			throw new Error("Upload failed");
		});
		const controller = new UploadController(mockService as any);
		app = new Hono();
		app.route("/uploads", controller.controller);

		const response = await app.request(`http://localhost/uploads${path}`, {
			method: "POST",
			body: makeForm(
				path === "/audio" ? "sound.mp3" : `${path.slice(1)}.png`,
				path === "/audio" ? "audio/mpeg" : "image/png",
			),
		});

		expect(response.status).toBe(500);
		const body = await response.json();
		expectServerErrorApiResponse(body);
		expect(mockService[methodName]).toHaveBeenCalledTimes(1);
	});

	test("returns 400 when file is missing from multipart form", async () => {
		const emptyForm = new FormData();
		emptyForm.append("note", "missing file");

		const response = await app.request("http://localhost/uploads/avatar", {
			method: "POST",
			body: emptyForm,
		});

		expect(response.status).toBe(400);
		expect(mockService.uploadAvatar).not.toHaveBeenCalled();
	});
});
