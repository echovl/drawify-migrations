import AWS from "aws-sdk"
import { config } from "dotenv"
import fs from "fs"
import { promisify } from "util"
import { nanoid } from "nanoid"
import { fileTypeFromBuffer } from "file-type"
import path from "path"
import { fileURLToPath } from "url"

config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function start() {
    console.log("Running migration script...")

    const file = await promisify(fs.readFile)(
        __dirname + "/../sample-project.json"
    )

    const template = JSON.parse(file.toString())

    for (const obj of template.objects) {
        if (obj.type == "image") {
            obj.src = await uploadImage(nanoid(), obj.src)
        }
    }

    console.log(template)
}

async function uploadImage(key: string, body: string): Promise<string> {
    const s3 = new AWS.S3({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_ID as string,
        },
    })

    const buffer = Buffer.from(body.replace(/^.+,/, ""), "base64")
    const ext = (await fileTypeFromBuffer(buffer))?.ext
    const keyWithExtension = ext ? `${key}.${ext}` : key

    await s3
        .putObject({
            Bucket: "drawify-dev",
            Key: keyWithExtension,
            Body: buffer,
            ACL: "public-read",
        })
        .promise()

    return `https://drawify-dev.s3.amazonaws.com/${keyWithExtension}`
}

start()
