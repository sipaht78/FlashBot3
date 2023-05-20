import {BigNumber, ethers} from "ethers";
import {FlashbotsBundleProvider} from "@flashbots/ethers-provider-bundle";
import {FlashbotsBundleTransaction, SimulationResponseSuccess} from "@flashbots/ethers-provider-bundle/src";
import {BundleRPC} from "./BundleRPC";
import {AppSecrets} from "./secrets";





const flashBot_goerli: BlockBuilder = {
    name: "FlashBot",
    url: "https://relay-goerli.flashbots.net",
    authHeader: "X-Flashbots-Signature"
}

const flashBot_sepolia: BlockBuilder = {
    name: "FlashBot-sepolia",
    url: "https://relay-sepolia.flashbots.net",
    authHeader: "X-Flashbots-Signature"
}

const blockNative_goerli: BlockBuilder = {
    name: "BlockNative",
    url: "https://api.blocknative.com/v1/auction?network=goerli",
    authHeader: "X-Auction-Signature"
}

const goerliNet: EthNetwork = {
    name: "goerli",
    chainId: 5,
    apiUrl: "https://goerli.infura.io/v3/4b4b59cb56fc48daa360ae4bf463c652"
}

const sepoliaNet: EthNetwork = {
    name: "sepolia",
    chainId: 11155111,
    apiUrl: "https://sepolia.infura.io/v3/4b4b59cb56fc48daa360ae4bf463c652"
}


main([flashBot_goerli, blockNative_goerli], goerliNet)

async function main(blockBuilders: BlockBuilder[], ethNetwork: EthNetwork) {
    const provider = new ethers.providers.JsonRpcProvider({url: ethNetwork.apiUrl});
    const wallet = new ethers.Wallet(AppSecrets.PRIVATE_KEY6, provider)

    const authSigner = new ethers.Wallet(AppSecrets.PRIVATE_KEY8, provider);

    const bundleRPC = new BundleRPC(authSigner)
    const flashBotsProvider = await FlashbotsBundleProvider.create(provider, authSigner, blockBuilders[0].url, ethNetwork.name);


    let feeData = await provider.getFeeData()
    if (feeData.maxFeePerGas == null || feeData.maxPriorityFeePerGas == null) {
        console.log("feeData unavailable")
        return
    }

    let nonce = await wallet.getTransactionCount()

    let tx1 = await wallet.signTransaction({
        to: "0xE4BaacFB751c7659ba5b790056e3f01BD66BE69C",
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: feeData.maxFeePerGas,
        type: 2,
        gasLimit: 21000,
        chainId: ethNetwork.chainId,
        nonce: BigNumber.from(nonce),
        value: ethers.utils.parseUnits("0.000008", "ether"),
    })
    let tx2 = await wallet.signTransaction({
        to: "0x774568C687978E9AFAF5F8b7Bf582cDd46dC2F6d",
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: feeData.maxFeePerGas,
        type: 2,
        gasLimit: 21000,
        chainId: ethNetwork.chainId,
        nonce: BigNumber.from(nonce + 1),
        value: ethers.utils.parseUnits("0.000008", "ether"),
    })

    // let signedTransactions = await flashBotsProvider.signBundle(bundle);

    console.log("lastBaseFeePerGas=" + ethers.utils.formatUnits(feeData.lastBaseFeePerGas!!, 9) + "Gwei")
    console.log("maxFeePerGas=" + ethers.utils.formatUnits(feeData.maxFeePerGas, 9) + "Gwei")
    console.log("maxPriorityFeePerGas=" + ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, 9) + "Gwei")
    console.log("gasPrice=" + ethers.utils.formatUnits(feeData.gasPrice!!, 9) + "Gwei \n")

    const blockNumber = await provider.getBlockNumber()
    console.log("Latest Block Number=" + blockNumber)

    let s1 = await do_simulation([tx1, tx2], blockNumber, blockBuilders[0], bundleRPC)
    let s2 = await do_simulation([tx1, tx2], blockNumber, blockBuilders[1], bundleRPC)

    for (let i = 1; i <= 10; i++) {
        for (let blockBuilder of blockBuilders) {
            // await delay(1000);
            bundleRPC.eth_sendBundle([tx1, tx2], blockNumber + i, blockBuilder)
        }
        // bundleRPC.eth_sendBundle(signedTransactions, blockNumber + i, blockNative_goerli)
    }

    // await delay(5000);
    //
    // for (let i = 1; i <= 3; i++) {
    //     let bundleStat = await flashBotsProvider.getBundleStatsV2(s1.bundleHash, blockNumber + i)
    //     if ("error" in bundleStat) {
    //         console.log("Bundle not simulated for hash=" + s1.bundleHash + " block = " + (blockNumber + i))
    //         return
    //     } else {
    //         console.log(blockNumber + i, " simulatedAt: ", bundleStat.simulatedAt, " receivedAt: ", bundleStat.simulatedAt, " consideredByBuildersAt: " + bundleStat.consideredByBuildersAt)
    //     }
    // }


}


async function do_simulation(signedTransactions: Array<string>, blockNumber: number, blockBuilder: BlockBuilder, bundleRPC: BundleRPC): Promise<SimulationResponseSuccess> {
    let t1 = new Date().getMilliseconds()
    let simResult = await bundleRPC.eth_callBundle(signedTransactions, blockNumber, blockBuilder)
    let t2 = new Date().getMilliseconds()
    console.log(`Simulation time = ${t2 - t1}ms`);
    console.log(simResult)
    return simResult
}


function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}


export interface BlockBuilder {
    name: string,
    url: string,
    authHeader: string
}

export interface EthNetwork {
    chainId: number
    name: string,
    apiUrl: string
}