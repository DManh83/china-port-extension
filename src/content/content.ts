/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"

const name = "riverhe@sfyf.cn"
const password = "FY123456"

async function waitUntil(condition: () => boolean, timeout = 30000, interval = 500) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
        if (condition()) {
            return
        }

        await sleep(interval)
    }

    throw new Error("Timeout")
}

chrome.storage.local.get(["started"], async (result) => {
    if (result.started) {
        console.log("Boot started")
        await boot()
    }
})

async function boot() {
    const url = location.href

    console.log("Boot:", url)

    if (!url.includes("www.chinaports-agency.com")) {
        return
    }

    if (url.includes("/#/login")) {
        console.log("Run login")
        await login()
        return
    }

    if (url === "https://www.chinaports-agency.com:8870/#/exportBusinessOperations/maintenanceOfManifestData") {
        console.log("Run waitManifestReady")
        await waitManifestReady()
        return
    }

    console.log("Redirect to manifest")
    await redirectManifest()
}

async function login() {
    const user = document.querySelector('[placeholder="Please enter your login account"]') as HTMLInputElement

    const pass = document.querySelector('[placeholder="Please enter your login password"]') as HTMLInputElement

    const captcha = document.querySelector('[placeholder="Please enter the verification code"]') as HTMLInputElement

    const btn = document.querySelector(".login-content-submit") as HTMLElement

    if (!user || !pass || !btn || !captcha) {
        setTimeout(login, 1000)

        return
    }

    const code = await solveCaptcha()

    setNativeValue(user, name)

    setNativeValue(pass, password)

    setNativeValue(captcha, code)

    btn.click()

    waitCaptchaSolved()
}

async function solveCaptcha(): Promise<string | null> {
    const captchaImg = document.querySelector(".login-content-captcha .el-image__inner") as HTMLImageElement

    // Wait for image to load
    await waitUntil(() => captchaImg?.complete && captchaImg?.naturalWidth > 0, 10000)

    if (!captchaImg?.src || !captchaImg?.complete || captchaImg?.naturalWidth === 0) {
        console.log("Captcha image not loaded")
        return null
    }

    const base64 = captchaImg.src.replace("data:image/png;base64,", "")

    const param = new URLSearchParams({
        user: 'nfwyst',
        pass: 'daisikia',
        softid: '898124',
        codetype: '1005',
        file_base64: base64,
    }).toString()

    const url = 'https://upload.chaojiying.net/Upload/Processing.php'
    const response = await axios.post(url, param, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    let captcha = response.data.pic_str
    console.log("Captcha response:", response.data)

    // Captcha format: Số1ToánTửSố2= (e.g., "4X9=", "12+5=")
    // Find operator position and extract numbers
    const operators = ['+', '-', '*', 'X', 'x', '/']
    let operator = ''
    let num1 = ''
    let num2 = ''
    let operatorIndex = -1

    // Find the operator (not at position 0 or last position)
    for (let i = 1; i < captcha.length - 1; i++) {
        if (operators.includes(captcha[i])) {
            operatorIndex = i
            operator = captcha[i].toUpperCase() === 'X' ? '*' : captcha[i]
            num1 = captcha.substring(0, i)
            num2 = captcha.substring(i + 1, captcha.length - 1) // exclude last "="
            break
        }
    }

    if (operatorIndex > 0 && !isNaN(Number(num1)) && !isNaN(Number(num2))) {
        try {
            const n1 = Number(num1)
            const n2 = Number(num2)
            let result: number

            switch (operator) {
                case '+':
                    result = n1 + n2
                    break
                case '-':
                    result = n1 - n2
                    break
                case '*':
                    result = n1 * n2
                    break
                case '/':
                    result = n1 / n2
                    break
                default:
                    result = Number(captcha)
            }

            captcha = String(Math.round(result))
            console.log(`Calculated captcha: ${num1}${operator}${num2}=${captcha}`)
        } catch (e) {
            console.error("Failed to calculate captcha:", e)
        }
    }

    return captcha
}

async function waitCaptchaSolved() {
    const timer = setInterval(async () => {
        const captcha = document.querySelector("#tCaptchaDyMainWrap")

        const stillLoginPage = location.href.includes("/#/login")

        if (!stillLoginPage) {
            clearInterval(timer)
            await redirectManifest()
            return
        }

        if (!captcha) {
            clearInterval(timer)
            await waitLoginSuccess()
            return
        }
    }, 1000)
}

async function waitLoginSuccess() {
    await waitUntil(() => !location.href.includes("/#/login"))
    console.log("Login success")

    // await redirectManifest()
}

async function redirectManifest() {
    const manifestUrl = "https://www.chinaports-agency.com:8870/#/exportBusinessOperations/maintenanceOfManifestData"

    if (location.href === manifestUrl) {
        await waitManifestReady()
        return
    }

    location.href = manifestUrl

    await waitUntil(() => location.href === manifestUrl)
    console.log("Arrived manifest page")

    await waitManifestReady()
}

async function waitManifestReady() {
    console.log("Wait manifest ready")
    await waitUntil(() => {
        const btns = document.querySelectorAll(".el-button.el-button--primary") as NodeListOf<HTMLElement>

        return btns.length >= 3
    })
    const btns = document.querySelectorAll(".el-button.el-button--primary") as NodeListOf<HTMLElement>
    btns[2]?.click()
    chrome.storage.local.get(["blNo", "username"], async (result) => {
        await importData(result.blNo as string, result.username as string)
    })
}

async function getData(blNo: string) {
    const data = await axios.get(`https://www.dadaex.cn/api/vn/order/getManifestInfo?blNo=${blNo}`)
    if (!data.data.data) {
        return null
    }
    if (data.data.data.uploadPortData.nameEn === "BUSAN") {
        data.data.data.uploadPortData.nameEn = "PUSAN"
    }
    if (data.data.data.aimPortData.nameEn === "BUSAN") {
        data.data.data.aimPortData.nameEn = "PUSAN"
    }
    if (data.data.data.uploadPortData.nameEn === "ICD HYDERABAD") {
        data.data.data.uploadPortData.nameEn = "HYDERABAD"
    }
    if (data.data.data.aimPortData.nameEn === "ICD HYDERABAD") {
        data.data.data.aimPortData.nameEn = "HYDERABAD"
    }

    for (const good of data.data.data.cdgoods) {
        const unit = good.unit?.trim()?.toUpperCase()

        if (!unit) continue

        if (unit.endsWith("S")) {
            good.unit = unit.slice(0, -1)
        }
    }
    for (const con of data.data.data.cdCon) {
        con.cType = getCType(con.cType)
        if (con.cType.includes("HQ")) {
            con.cType = con.cType.replace("HQ", "HC")
        }
        con.size = con.cType.match(/\d+/)?.[0] || ""
        con.type = con.cType.match(/[A-Za-z]+/)?.[0] || ""
    }

    if (data.data.data.carrier.code === "TSL") {
        data.data.data.carrier.code = "TSC"
    }
    if (data.data.data.carrier.code === "ZHONGGU") {
        data.data.data.carrier.code = "ZGXL"
    }

    return data.data.data
}

function getCType(cType: number) {
    const containerNumberMap = {
        0: "20GP",
        1: "40GP",
        2: "40HQ",
        3: "20FR",
        4: "40FR",
        5: "20RF",
        6: "40RF",
        7: "20OT",
        8: "40OT",
        9: "40OH",
        10: "20TK",
        11: "40TK",
        12: "20HT",
        13: "40HT",
        14: "45HQ",
        15: "20DG",
        16: "40DG",
        17: "20FQ",
        18: "40FQ",
    }

    return containerNumberMap[cType as keyof typeof containerNumberMap]
}

async function importData(blNo: string, username: string) {
    const ystObj = () => {
        return {
            1: "CY-CY",
            2: "CY-CFS",
            3: "CFS-CY",
            4: "CFS-CFS",
            5: "CY-DR",
            6: "CFS-DR",
            7: "DR-CY",
            8: "DR-CFS",
            9: "DR-DR",
            10: "CY-RAMP",
            11: "CY-FO",
            12: "CY-LO",
            13: "DR-FO",
            14: "DR-LO",
            15: "TACKLE-CY",
            16: "CY-TACKLE",
            17: "TACKLE-CFS",
            18: "RAMP-CY",
            19: "FI-CY",
            20: "FI-D",
            21: "LI-CY",
            22: "LI-DR",
            23: "CY-SHIPSHOOK",
            24: "CY-RAMP",
        }
    }

    const data = await getData(blNo)
    console.log("data", data)

    const transportTerms = (ystObj()[data.transportTerms as keyof typeof ystObj] as string).split("-")
    const transportTerm = transportTerms[0] + "/" + transportTerms[1]

    if (!data) {
        console.error("Data not found")
        return
    }

    setTimeout(async () => {
        const btns = document.querySelectorAll(".el-button.el-button--primary") as NodeListOf<HTMLElement>

        btns[1]?.click()

        await waitUntil(() => {
            return location.href.includes("/newManifest?flag=0&billId=0")
        })
        try {
            // ship name
            const shipNameFull = `${data.shipName}/${data.voyage}`
            await chooseSelectByLabel("船名航次", data.shipName, shipNameFull, 2)
            // Loading port
            await chooseSelectByLabel("装货港", data.loadCode, `${data.loadCode}/${data.loadPortData.nameEn}`, 3)
            // Discharge port
            await chooseSelectByLabel("卸货港", data.uploadCode, `${data.uploadCode}/${data.uploadPortData.nameEn}`, 4)
            // Payment method
            await selectPaymentMethod("付款方式", "PREPAID", 5)
            // Carrier
            await selectPaymentMethod("提单承运人", data.carrier.code, 6)
            // BL No
            const blNoInput = document.querySelector(".el-input__inner") as HTMLInputElement
            setNativeValue(blNoInput, data.blNo)
            // Destination port
            await chooseSelectByLabel("目的港", data.aimPortCode, `${data.aimPortCode}/${data.aimPortData.nameEn}`, 7)
            // Service terms
            await selectPaymentMethod("服务条款", transportTerm, 8)
            // BL type
            await selectPaymentMethod("提单性质", "正常", 9)
            // Shipper
            await setTextareaByLabel("发货人", getContactByType(false, data)?.master || "")
            // Consignee
            await setTextareaByLabel("收货人", getContactByType(true, data)?.master || "")
            // Notify party
            await setTextareaByLabel("通知人", getContactByType(2, data)?.master || "")
            // Shipper address
            await setInputByLabel("发货人地址", getContactByType(false, data)?.address || "")
            // Consignee address
            await setInputByLabel("收货人地址", getContactByType(true, data)?.address || "")
            // Notify party address
            await setInputByLabel("通知人地址", getContactByType(2, data)?.address || "")
            // Shipper country code
            // await setInputByLabel("发货人国家代码", getContactByType(false)?.country || "")
            await chooseSelectByLabel(
                "发货人国家代码",
                getContactByType(false, data)?.country || "",
                getContactByType(false, data)?.country || "",
                10
            )
            // Consignee country code
            // await setInputByLabel("收货人国家代码", getContactByType(2)?.country || "")
            await chooseSelectByLabel("收货人国家代码", getContactByType(2, data)?.country || "", getContactByType(2, data)?.country || "", 11)
            // Notify party country code
            // await setInputByLabel("通知人国家代码", getContactByType(true)?.country || "")
            await chooseSelectByLabel("通知人国家代码", getContactByType(true, data)?.country || "", getContactByType(true, data)?.country || "", 12)
            // Shipper phone
            await setInputByLabel("发货人电话", getContactByType(false, data)?.phone || "")
            // Consignee phone
            await setInputByLabel("收货人电话", getContactByType(2, data)?.phone || "")
            // Notify party phone
            await setInputByLabel("通知人电话", getContactByType(true, data)?.phone || "")

            // Goods
            for (const good of data.cdgoods) {
                await waitUntil(() => !!document.querySelector(".el-button.el-button--primary.el-button--small"))
                const buttonNewContact = document.querySelector(".el-button.el-button--primary.el-button--small") as HTMLElement
                buttonNewContact.click()

                // Amount
                await waitUntil(() => {
                    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
                        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === "件数"
                    ) as HTMLElement

                    if (!formItem) {
                        return false
                    }

                    return true
                })
                await setInputByLabel("件数", good.amount)
                // Weight
                await waitUntil(() => {
                    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
                        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === "重量 KGS"
                    ) as HTMLElement

                    if (!formItem) {
                        return false
                    }
                    return true
                })
                await setInputByLabel("重量 KGS", good.weight)
                // Volume
                await waitUntil(() => {
                    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
                        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === "体积(立方米)"
                    ) as HTMLElement

                    if (!formItem) {
                        return false
                    }
                    return true
                })
                await setInputByLabel("体积(立方米)", good.volume)

                // Goods name
                await waitUntil(() => {
                    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
                        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === "品名"
                    ) as HTMLElement

                    if (!formItem) {
                        return false
                    }
                    return true
                })
                await setTextareaByLabel("品名", good.name)
                // Mark
                await waitUntil(() => {
                    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
                        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === "唛头"
                    ) as HTMLElement

                    if (!formItem) {
                        return false
                    }
                    return true
                })
                await setTextareaByLabel("唛头", good.shantou)
                // Pack type
                await waitUntil(() => {
                    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
                        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === "包装类型名称"
                    ) as HTMLElement
                    console.log("formItem", formItem)
                    if (!formItem) {
                        return false
                    }
                    return true
                })
                const select = document.querySelectorAll(".el-popper.is-pure.is-light.el-select__popper") as NodeListOf<HTMLElement>
                const index = select.length - 1
                await chooseSelectByLabel("包装类型名称", good.unit, good.unit, index)

                // Cargo type
                await waitUntil(() => {
                    const radio = document.querySelector(".el-radio") as HTMLElement
                    return radio ? true : false
                })
                const cargoType = good.cargoType === false ? "普通" : "危险品"
                await selectRadioByLabel(cargoType)

                // await sleep(10000)
                // Save
                const buttonCreate = Array.from(document.querySelectorAll(".el-button.el-button--primary.el-button--default")).find(
                    (item) => item.querySelector(".el-button__text--expand")?.textContent?.trim() === "保存"
                ) as HTMLElement
                console.log("buttonCreate", buttonCreate)
                buttonCreate.click()
            }

            // containner_vgms
            for (const container of data.cdCon) {
                const buttonCreate = document.querySelector(".vxe-button.type--button.size--mini.theme--primary") as HTMLElement
                console.log("buttonCreate", buttonCreate)
                buttonCreate.click()
                await sleep(3000)

                //container number
                let input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                setNativeValue(input, container.boxNub || "")
                await sleep(500)

                // seal number
                const selectAll = document.querySelectorAll(".vxe-cell--label") as NodeListOf<HTMLElement>
                const clickSelect = selectAll[0] as HTMLElement
                clickSelect.click()
                await sleep(500)
                input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                setNativeValue(input, container.sealNUb || "")
                await sleep(500)

                // size
                const clickSelectSize = selectAll[1] as HTMLElement
                clickSelectSize.click()
                await sleep(500)
                input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                input.click()
                await sleep(1000)

                console.log("size", container.size)

                const optionSize = Array.from(document.querySelectorAll(".vxe-select-option")).find(
                    (x) => x.textContent === container.size
                ) as HTMLElement

                console.log("optionSize", optionSize)
                optionSize.click()
                await sleep(1000)

                // Type
                const clickSelectType = selectAll[2] as HTMLElement
                clickSelectType.click()
                await sleep(500)
                const selectType = document.querySelectorAll(".el-select__selection")[11] as HTMLInputElement
                selectType.click()
                console.log("selectType", selectType)
                await sleep(1000)

                await chooseSelect(container.type, 14)
                await sleep(1000)

                // status
                const clickSelectStatus = selectAll[3] as HTMLElement
                clickSelectStatus.click()
                await sleep(500)
                input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                input.click()
                const status = "F"
                await sleep(1000)
                const optionStatus = Array.from(document.querySelectorAll(".vxe-select-option")).find((x) => x.textContent === status) as HTMLElement
                console.log("optionStatus", optionStatus)
                optionStatus.click()
                await sleep(1000)

                // // amount
                // const clickSelectAmount = selectAll[4] as HTMLElement
                // clickSelectAmount.click()
                // await sleep(500)
                // input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                // setNativeValue(input, container.amount || 0)
                // await sleep(500)

                // // weight
                // const clickSelectWeight = selectAll[5] as HTMLElement
                // clickSelectWeight.click()
                // await sleep(500)
                // input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                // setNativeValue(input, container.weight || 0)
                // await sleep(500)

                // // volume
                // const clickSelectVolume = selectAll[6] as HTMLElement
                // clickSelectVolume.click()
                // await sleep(500)
                // input = document.querySelector(".vxe-input--inner") as HTMLInputElement
                // setNativeValue(input, container.volume || 0)
                // await sleep(500)
            }

            await clickButtonByLabel("作为草稿保存")

            await sleep(3000)
            // Change status manifest
            const isSuccess = await changeStatusManifest(blNo)
            if (isSuccess) {
                console.log("Change status manifest success")
            } else {
                console.error("Change status manifest failed")
            }

            // Add log manifest
            const isSuccessLog = await addLogManifest(blNo, username, data.carrier.code)
            if (isSuccessLog) {
                console.log("Add log manifest success")
            } else {
                console.error("Add log manifest failed")
            }

            chrome.storage.local.set({
                started: false,
            })
        } catch (error) {
            console.error("Error:", error)
        }
    }, 1000)
}

async function selectRadioByLabel(labelText: string) {
    const radio = Array.from(document.querySelectorAll(".el-radio")).find(
        (el) => el.querySelector(".el-radio__label")?.textContent?.trim() === labelText
    ) as HTMLElement

    if (!radio) {
        throw new Error(`Radio "${labelText}" not found`)
    }

    radio.click()
}

function setNativeValue(element: HTMLInputElement, value: string | number) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set

    setter?.call(element, value)

    element.dispatchEvent(
        new Event("input", {
            bubbles: true,
        })
    )

    element.dispatchEvent(
        new Event("change", {
            bubbles: true,
        })
    )
}

async function selectPaymentMethod(label: string, value: string, i: number) {
    const form = Array.from(document.querySelectorAll(".el-form-item")).find(
        (x) => x.querySelector(".el-form-item__label")?.textContent?.trim() === label
    ) as HTMLElement
    const wrapper = form?.querySelector(".el-select__wrapper") as HTMLElement

    wrapper?.click()
    await sleep(1000)

    const selectPoppers = document.querySelectorAll(".el-popper.is-pure.is-light.el-select__popper") as NodeListOf<HTMLElement>

    const selectPopper = selectPoppers[i] as HTMLElement

    const option = Array.from(selectPopper.querySelectorAll(".el-select-dropdown__item")).find((x) =>
        x.textContent?.toUpperCase().includes(value.toUpperCase())
    ) as HTMLElement

    if (!option) throw Error(`missing ${value}`)

    option.click()

    // đóng dropdown
    document.body.click()

    await sleep(1000)

    console.log("Selected", label, value)
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
}

async function chooseSelectByLabel(label: string, code: string, full: string, i: number) {
    const form = Array.from(document.querySelectorAll(".el-form-item")).find(
        (x) => x.querySelector(".el-form-item__label")?.textContent?.trim() === label
    ) as HTMLElement

    const wrapper = form?.querySelector(".el-select__wrapper") as HTMLElement

    wrapper?.click()

    await sleep(500)

    const input = wrapper?.querySelector(".el-select__input.is-default") as HTMLInputElement
    console.log("input", input)

    setNativeValue(input, code)

    await sleep(500)
    const selectPopper = await waitForSelectPopper(i)

    const option = await waitForOption(selectPopper, full)

    option.click()

    document.body.click()
}

async function waitForSelectPopper(index: number, timeout = 10000): Promise<HTMLElement> {
    const start = Date.now()

    while (Date.now() - start < timeout) {
        const poppers = document.querySelectorAll(".el-popper.is-pure.is-light.el-select__popper") as NodeListOf<HTMLElement>

        const popper = poppers[index]

        if (popper) {
            return popper
        }

        await sleep(300)
    }

    throw new Error(`Missing select popper at index ${index}`)
}

async function waitForOption(selectPopper: HTMLElement, full: string, timeout = 15000): Promise<HTMLElement> {
    const start = Date.now()

    while (Date.now() - start < timeout) {
        const option = Array.from(selectPopper.querySelectorAll(".el-select-dropdown__item")).find((x) =>
            x.textContent?.toUpperCase().includes(full.toUpperCase())
        ) as HTMLElement | undefined

        if (option) {
            return option
        }

        await sleep(300)
    }

    throw new Error(`Timeout waiting for option: ${full}`)
}

async function chooseSelect(value: string, i: number) {
    const selectPopper = await waitForSelectPopper(i)

    const option = await waitForOption(selectPopper, value)

    option.click()

    return true
}

async function setTextareaByLabel(labelText: string, value: string) {
    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === labelText
    ) as HTMLElement

    if (!formItem) {
        throw Error(`${labelText} not found`)
    }

    const textarea = formItem.querySelector("textarea") as HTMLTextAreaElement

    if (!textarea) {
        throw Error(`${labelText} textarea missing`)
    }

    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set

    setter?.call(textarea, value)

    textarea.dispatchEvent(new Event("input", { bubbles: true }))

    textarea.dispatchEvent(new Event("change", { bubbles: true }))

    textarea.dispatchEvent(new Event("blur", { bubbles: true }))

    console.log(`${labelText} updated`)
}

async function setInputByLabel(labelText: string, value: string) {
    const formItem = Array.from(document.querySelectorAll(".el-form-item")).find(
        (item) => item.querySelector(".el-form-item__label")?.textContent?.trim() === labelText
    ) as HTMLElement

    if (!formItem) {
        throw Error(`${labelText} not found`)
    }

    const input = formItem.querySelector("input") as HTMLInputElement
    console.log("input", input)

    if (!input) {
        throw Error(`${labelText} input missing`)
    }

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set

    setter?.call(input, value)

    input.dispatchEvent(new Event("input", { bubbles: true }))

    input.dispatchEvent(new Event("change", { bubbles: true }))

    input.dispatchEvent(new Event("blur", { bubbles: true }))

    console.log(`${labelText} updated`)
}

function getContactByType(type: boolean | number, data: any) {
    return data.cabContacts.find((x: any) => x.type === type)
}

async function clickButtonByLabel(labelText: string) {
    const button = Array.from(document.querySelectorAll(".el-button.el-button--primary")).find(
        (el) => el.textContent?.trim() === labelText
    ) as HTMLElement

    if (!button) {
        throw new Error(`Button "${labelText}" not found`)
    }

    button.click()
}

async function changeStatusManifest(blNo: string) {
    try {
        const data = await axios.post(`https://www.dadaex.cn/api/vn/order/changeStatusManifest`, { blNo: blNo })
        if (data.data.status === 1) return true
        return false
    } catch (error) {
        console.error("Error:", error)
        return false
    }
}

async function addLogManifest(blNo: string, username: string, carrierCode: string) {
    try {
        const data = await axios.post(`https://www.dadaex.cn/api/vn/order/addLogManifest`, {
            blNo: blNo,
            username: username,
            carrierCode: carrierCode,
        })
        if (data.data.status === 1) {
            console.log("Add log manifest success")
            return true
        }
        console.error("Add log manifest failed")
        return false
    } catch (error) {
        console.error("Error:", error)
        console.error("Add log manifest failed")
        return false
    }
}
