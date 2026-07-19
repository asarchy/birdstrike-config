// Minimal WebHID ambient types (Chrome / Edge)
interface HIDCollectionInfo {
	usagePage: number;
	usage: number;
}

interface HIDDevice extends EventTarget {
	opened: boolean;
	vendorId: number;
	productId: number;
	productName: string;
	collections: HIDCollectionInfo[];
	open(): Promise<void>;
	close(): Promise<void>;
	sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
	receiveFeatureReport(reportId: number): Promise<DataView>;
}

interface HIDDeviceRequestOptions {
	filters: {
		vendorId?: number;
		productId?: number;
		usagePage?: number;
		usage?: number;
	}[];
}

interface HIDConnectionEvent extends Event {
	device: HIDDevice;
}

interface HID extends EventTarget {
	requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
	getDevices(): Promise<HIDDevice[]>;
}

interface Navigator {
	hid?: HID;
}
