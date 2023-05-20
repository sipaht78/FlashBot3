import {ethers} from "ethers";
import {BlockBuilder} from "./myTypeScript";

export class BundleRPC {

    authSigner: ethers.Wallet

    constructor(authSigner: ethers.Wallet) {
        this.authSigner = authSigner;
    }

    async eth_callBundle(signedTransactions: Array<string>, blockNumber: number, blockBuilder: BlockBuilder) {
        let jsonBody: string = JSON.stringify({
            jsonrpc: '2.0',
            method: `eth_callBundle`,
            params: [{
                "txs": signedTransactions,
                "blockNumber": "0x" + blockNumber.toString(16),
                "stateBlockNumber": "latest"
            }],
            id: 1
        });
        let signature = this.authSigner.address + ":" + await this.authSigner.signMessage(ethers.utils.id(jsonBody));

        let headersss: [string, string][] = [
            ["Content-Type", "application/json"],
            [blockBuilder.authHeader, signature]
        ]
        // console.log("----- jsonBody ------")
        // console.log(jsonBody)
        // console.log(headersss)

        const request: RequestInit = {
            method: 'POST',
            headers: headersss,
            body: jsonBody,
        }

        return this.doRequest(blockBuilder.url, request, blockNumber, blockBuilder.name, "Simulation")
    }

    async eth_sendBundle(signedTransactions: Array<string>, blockNumber: number, blockBuilder: BlockBuilder) {
        let jsonBody: string = JSON.stringify({
            jsonrpc: '2.0',
            method: `eth_sendBundle`,
            params: [{
                "txs": signedTransactions,
                "blockNumber": "0x" + blockNumber.toString(16)
            }],
            id: 1
        });
        let signature = this.authSigner.address + ":" + await this.authSigner.signMessage(ethers.utils.id(jsonBody));

        let headersss: [string, string][] = [
            ["Content-Type", "application/json"],
            [blockBuilder.authHeader, signature]
        ]
        const request: RequestInit = {
            method: 'POST',
            headers: headersss,
            body: jsonBody,
        }

        return this.doRequest(blockBuilder.url, request, blockNumber, blockBuilder.name, "Submission")
    }


    private async doRequest(url: string, request: RequestInit, blockNumber: number, blockBuilderName: string, methodName: string) {
        let response = await fetch(url, request)
        const {result, error} = await response.json()
        if (error != null) {
            console.error(`Builder ${blockBuilderName} error due  ${methodName}  code= ${response.status}  block=${blockNumber}`)
            console.log(error)
            return null
        }
        if (!response.ok) {
            console.error(`Builder ${blockBuilderName} wrong response due  ${methodName}  code= ${response.status}  block=${blockNumber}`)
            console.error(response.statusText)
            return null
        }

        console.log(`Builder ${blockBuilderName} successfully did ${methodName} of bundle for block=${blockNumber}, bundleHash=${result.bundleHash}  `)
        return result
    }


}

