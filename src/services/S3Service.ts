import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { encodeObjectKeyForUrl, sanitizeObjectName } from "../utils";
import { Service } from "../di/decorators/service";

@Service()
export class S3Sservice {
	private readonly accessKey: string;
	private readonly secretKey: string;
	private readonly endpoint: string;
	private readonly bucketName: string;
	private readonly S3Client: S3Client;

	constructor() {
		this.accessKey = Bun.env.R2_ACCESS_KEY;
		this.secretKey = Bun.env.R2_SECRET_ACCESS_KEY;
		this.endpoint = Bun.env.R2_ENDPOINT;
		this.bucketName = Bun.env.R2_BUCKET_NAME || Bun.env.R2_BUCKET;
		this.S3Client = new S3Client({
			region: "auto",
			endpoint: this.endpoint,
			credentials: {
				accessKeyId: this.accessKey,
				secretAccessKey: this.secretKey,
			},
			forcePathStyle: true,
		});
	}

	getBucketName() {
		return this.bucketName;
	}

	getAvatarBucket() {
		return Bun.env.R2_DOMAIN;
	}

	getImageBucket() {
		return Bun.env.R2_DOMAIN;
	}

	private buildPublicUrl(key: string) {
		const bucketUrl = this.getImageBucket();
		const normalizedBucketUrl = bucketUrl.endsWith("/")
			? bucketUrl
			: `${bucketUrl}/`;

		return `${normalizedBucketUrl}${encodeObjectKeyForUrl(key)}`;
	}

	/**
	 *
	 * @param file
	 * Method for uploading an image to the S3 bucket
	 * The key is generated based on the current timestamp and the file name(also the folder it should go in inside the bucket)
	 * @returns The url of the uploaded image
	 */
	async uploadImage(file: File): Promise<string> {
		const key = `images/${Date.now()}-${sanitizeObjectName(file.name)}`;

		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: new Uint8Array(await file.arrayBuffer()),
			ContentType: file.type,
		});

		await this.S3Client.send(command);
		return this.buildPublicUrl(key);
	}

	//returns the url of the file
	async uploadAudioFile(file: File): Promise<string> {
		const key = `audio/${Date.now()}-${sanitizeObjectName(file.name)}`;

		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: new Uint8Array(await file.arrayBuffer()),
			ContentType: file.type,
		});

		await this.S3Client.send(command);
		return this.buildPublicUrl(key);
	}
	//returns the url of the file
	async uploadAvatar(file: File): Promise<string> {
		const key = `avatars/${Date.now()}-${sanitizeObjectName(file.name)}`;

		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: new Uint8Array(await file.arrayBuffer()),
			ContentType: file.type,
		});

		await this.S3Client.send(command);
		return this.buildPublicUrl(key);
	}
}
