import axios from "axios"

async function changeStatusManifest(blNo: string) {
    const data = await axios.post(`https://www.dadaex.cn/api/vn/order/changeStatusManifest`, { blNo: blNo })
    if (data.data.status === 1) return true
    return false
}

async function addLogManifest(blNo: string, carrierCode: string, username: string) {
    const data = await axios.post(`https://www.dadaex.cn/api/vn/order/addLogManifest`, { blNo: blNo, carrierCode: carrierCode, username: username })
    if (!data.data.data) {
        return null
    }
    return data.data.data
}

export { changeStatusManifest, addLogManifest }
