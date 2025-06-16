


import { SEAWEED_MASTER, SEAWEED_VOLUME } from "./constants"; // Adjust import as needed

export const uploadToSeaweed = async (buffer: Buffer, filename: string, mimeType: string = 'application/octet-stream'): Promise<string> => {
	// 1. Get FID & public URL from master
	const assignRes = await fetch(`${SEAWEED_MASTER}/dir/assign`);
	if (!assignRes.ok) {
		throw new Error(`Failed to get assignment from SeaweedFS: ${assignRes.statusText}`);
	}

	const assignJson = await assignRes.json();
	const { fid, publicUrl } = assignJson;

	// 2. Use native Bun-compatible FormData
	const form = new FormData();
	const blob = new Blob([buffer], { type: mimeType });
	form.append('file', blob, filename);

	// 3. Upload to volume server
	const uploadRes = await fetch(`http://${publicUrl}/${fid}`, {
		method: 'POST',
		body: form
	});

	if (!uploadRes.ok) {
		throw new Error(`Failed to upload file to SeaweedFS: ${uploadRes.statusText}`);
	}

	return `http://${publicUrl}/${fid}`;
};


/**
 * Downloads a file from SeaweedFS using its FID.
 *
 * @param fid - The file ID (fid) returned during upload.
 * @returns A promise that resolves to a Blob representing the file content.
 * @throws If the file cannot be retrieved or if no public volume URL is found.
 */
export const getFromSeaweed = async (fid: string): Promise<Blob> => {
	// 1. Lookup volume server from Seaweed master using volumeId from fid
	const volumeId = fid.split(',')[0];
	const lookupRes = await fetch(`${SEAWEED_MASTER}/dir/lookup?volumeId=${volumeId}`);
	if (!lookupRes.ok) {
		throw new Error(`Failed to lookup volume for fid ${fid}: ${lookupRes.statusText}`);
	}

	const lookupJson = await lookupRes.json();
	const publicUrl = lookupJson?.locations?.[0]?.publicUrl;

	if (!publicUrl) {
		throw new Error(`No public volume server found for fid ${fid}`);
	}

	// 2. Fetch file from SeaweedFS volume server
	const fileRes = await fetch(`http://${publicUrl}/${fid}`);
	if (!fileRes.ok) {
		throw new Error(`Failed to fetch file from SeaweedFS: ${fileRes.statusText}`);
	}

	return await fileRes.blob();
};
