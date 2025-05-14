export interface DecodedTransactionData {
	name: string;
	signature: string;
	inputs: Record<string, any>;
}

export interface WalletTransaction {
	chain_id: number;
	block_number: string;
	block_hash: string;
	block_timestamp: string;
	hash: string;
	nonce: number;
	transaction_index: number;
	from_address: string;
	to_address: string;
	value: number;
	gas_price: number;
	gas: number;
	function_selector: string;
	data: string;
	max_fee_per_gas: number;
	max_priority_fee_per_gas: number;
	transaction_type: number;
	r: number;
	s: number;
	v: number;
	access_list_json: string;
	contract_address: string;
	gas_used: number;
	cumulative_gas_used: number;
	effective_gas_price: number;
	blob_gas_used: number;
	blob_gas_price: number;
	logs_bloom: string;
	status: number;
	decoded?: DecodedTransactionData;
	decodedData?: DecodedTransactionData;
}

export interface WalletTransactionMeta {
	chain_ids: number[];
	address: string;
	signature: string;
	page: number;
	limit_per_chain: number;
	total_items: number;
	total_pages: number;
}

export interface WalletTransactionResponse {
	data: WalletTransaction[];
	aggregations: any | null;
	meta: WalletTransactionMeta;
}
