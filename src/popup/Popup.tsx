import { useEffect, useState } from "react"
import "../App.css"

function Popup() {
    const loginUrl = "https://www.chinaports-agency.com:8870/#/login?redirect=/exportBusinessOperations/maintenanceOfManifestData&params={}"

    const [blNo, setBlNo] = useState("")
    const [username, setUsername] = useState("")

    useEffect(() => {
        chrome.storage.local.get(["blNo", "username"], (result) => {
            setBlNo((result.blNo as string) || "")
            setUsername((result.username as string) || "")
        })
    }, [])

    const start = () => {
        chrome.storage.local.set({
            started: true,
            blNo,
            username,
        })

        chrome.tabs.query(
            {
                active: true,
                currentWindow: true,
            },
            (tabs) => {
                const tab = tabs[0]

                const isChinaPorts = tab.url?.includes("www.chinaports-agency.com")

                const isLogin = tab.url?.includes("/#/login")
                const isManifest = tab.url === "https://www.chinaports-agency.com:8870/#/exportBusinessOperations/maintenanceOfManifestData"
                console.log("tab.url", tab.url)
                console.log("isLogin", isLogin)
                console.log("isManifest", isManifest)
                console.log("isChinaPorts", isChinaPorts)

                if (!isChinaPorts) {
                    chrome.tabs.create({
                        url: loginUrl,
                    })
                    return
                }

                // Already on login page - just reload, content script will handle login
                if (isLogin) {
                    chrome.tabs.reload(tab.id!)
                    return
                }

                if (!isManifest) {
                    chrome.tabs.update(tab.id!, {
                        url: "https://www.chinaports-agency.com:8870/#/exportBusinessOperations/maintenanceOfManifestData",
                    })
                    return
                }

                chrome.tabs.reload(tab.id!)
            }
        )
    }

    return (
        <div className='popup-container'>
            <div className='popup-header'>
                <h1>🚀 China Ports Manifest</h1>
                <p>Nhập thông tin để bắt đầu</p>
            </div>

            <div className='form-group'>
                <label>Username</label>
                <input type='text' placeholder='Nhập username...' value={username} onChange={(e) => setUsername(e.target.value.toUpperCase())} />
            </div>

            <div className='form-group'>
                <label>BL No</label>
                <input type='text' placeholder='Nhập số vận đơn...' value={blNo} onChange={(e) => setBlNo(e.target.value.toUpperCase())} />
            </div>

            <button className='start-button' onClick={start}>
                ▶️ Bắt đầu
            </button>

            <div className='popup-footer'>
                <span>China Ports Auto Manifest v1.0</span>
            </div>
        </div>
    )
}

export default Popup

