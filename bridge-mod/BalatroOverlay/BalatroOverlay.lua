--- BalatroOverlay Bridge Mod
--- Exports game state to JSON for the overlay application
---
--- @module BalatroOverlay

local BalatroOverlay = {}

-- Configuration
local CONFIG = {
    UPDATE_INTERVAL = 0.1,  -- 100ms update frequency
    OUTPUT_PATH = nil,      -- Set dynamically based on OS
    VERSION = "0.1.0",
    DEBUG = false
}

-- State tracking
local lastUpdate = 0
local isInitialized = false

--- Initialize the mod
function BalatroOverlay.init()
    -- Determine output path based on OS
    local appdata = os.getenv("APPDATA")
    if appdata then
        -- Windows
        CONFIG.OUTPUT_PATH = appdata .. "/Balatro/Mods/BalatroOverlay/overlay_state.json"
    else
        -- Linux/Mac fallback
        local home = os.getenv("HOME")
        CONFIG.OUTPUT_PATH = home .. "/.local/share/Balatro/Mods/BalatroOverlay/overlay_state.json"
    end

    -- Ensure output directory exists
    BalatroOverlay.ensureDirectory()

    isInitialized = true
    BalatroOverlay.log("BalatroOverlay initialized, version " .. CONFIG.VERSION)
end

--- Ensure output directory exists
function BalatroOverlay.ensureDirectory()
    local path = CONFIG.OUTPUT_PATH:match("(.+)/[^/]+$")
    if path then
        os.execute('mkdir "' .. path .. '" 2>nul')
    end
end

--- Log message (debug mode only)
function BalatroOverlay.log(message)
    if CONFIG.DEBUG then
        print("[BalatroOverlay] " .. message)
    end
end

--- Export current game state to JSON file
function BalatroOverlay.exportState()
    if not isInitialized then return end

    local state = BalatroOverlay.captureGameState()
    if not state then return end

    local json = BalatroOverlay.toJSON(state)
    BalatroOverlay.writeFile(json)
end

--- Capture current game state
--- @return table|nil Game state or nil if not in game
function BalatroOverlay.captureGameState()
    -- TODO: Implement actual game state capture
    -- This is a scaffold - actual implementation will hook into Balatro's internals

    return {
        timestamp = os.time(),
        version = CONFIG.VERSION,
        deck = {
            remaining = {},
            hand = {},
            discarded = {},
            played = {},
            totalCards = 52,
            cardsRemaining = 52
        },
        jokers = {},
        progress = {
            ante = 1,
            round = 1,
            phase = "menu",
            handsRemaining = 4,
            discardsRemaining = 3,
            money = 4
        },
        blind = {
            type = "small",
            name = "Small Blind",
            chipGoal = 300,
            chipsScored = 0,
            isBoss = false
        },
        handLevels = {},
        consumables = {
            tarots = {},
            planets = {},
            spectrals = {}
        },
        vouchers = {
            owned = {}
        },
        handHistory = {}
    }
end

--- Convert Lua table to JSON string
--- @param tbl table Table to convert
--- @return string JSON string
function BalatroOverlay.toJSON(tbl)
    -- Simple JSON encoder (basic implementation)
    local function encode(val, indent)
        indent = indent or 0
        local t = type(val)

        if t == "nil" then
            return "null"
        elseif t == "boolean" then
            return val and "true" or "false"
        elseif t == "number" then
            return tostring(val)
        elseif t == "string" then
            return '"' .. val:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', '\\n') .. '"'
        elseif t == "table" then
            local isArray = #val > 0 or next(val) == nil
            local parts = {}

            if isArray then
                for _, v in ipairs(val) do
                    table.insert(parts, encode(v, indent + 1))
                end
                return "[" .. table.concat(parts, ",") .. "]"
            else
                for k, v in pairs(val) do
                    table.insert(parts, '"' .. tostring(k) .. '":' .. encode(v, indent + 1))
                end
                return "{" .. table.concat(parts, ",") .. "}"
            end
        end

        return "null"
    end

    return encode(tbl)
end

--- Write JSON to file
--- @param json string JSON string to write
function BalatroOverlay.writeFile(json)
    local file = io.open(CONFIG.OUTPUT_PATH, "w")
    if file then
        file:write(json)
        file:close()
    else
        BalatroOverlay.log("Failed to write state file")
    end
end

--- Update hook - called every frame
--- @param dt number Delta time
function BalatroOverlay.update(dt)
    lastUpdate = lastUpdate + dt
    if lastUpdate >= CONFIG.UPDATE_INTERVAL then
        lastUpdate = 0
        BalatroOverlay.exportState()
    end
end

return BalatroOverlay
