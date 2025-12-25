--- BalatroOverlay Bridge Mod
--- Exports game state to JSON for the overlay application
---
--- @module BalatroOverlay

local BalatroOverlay = {}

-- Configuration
local CONFIG = {
    UPDATE_INTERVAL = 0.1,  -- 100ms update frequency (max 10/sec)
    OUTPUT_PATH = nil,      -- Set dynamically based on OS
    VERSION = "0.1.0",
    DEBUG = false
}

-- State tracking
local lastUpdate = 0
local isInitialized = false
local handHistory = {}
local MAX_HAND_HISTORY = 50

--------------------------------------------------------------------------------
-- HELPER FUNCTIONS
--------------------------------------------------------------------------------

--- Nil-safe access helper
--- @param obj any Object to access
--- @param ... string Keys to traverse
--- @return any|nil Value or nil if any key is nil
local function safeGet(obj, ...)
    local current = obj
    for _, key in ipairs({...}) do
        if current == nil or type(current) ~= "table" then
            return nil
        end
        current = current[key]
    end
    return current
end

--- Nil-safe number with default
--- @param val any Value to check
--- @param default number Default if nil/nan
--- @return number
local function safeNum(val, default)
    if val == nil or val ~= val then -- NaN check
        return default or 0
    end
    return tonumber(val) or default or 0
end

--- Nil-safe string with default
--- @param val any Value to check
--- @param default string Default if nil
--- @return string
local function safeStr(val, default)
    if val == nil then
        return default or ""
    end
    return tostring(val)
end

--- Nil-safe boolean
--- @param val any Value to check
--- @param default boolean Default if nil
--- @return boolean
local function safeBool(val, default)
    if val == nil then
        return default or false
    end
    return val and true or false
end

--- Log message (debug mode only)
local function log(message)
    if CONFIG.DEBUG then
        print("[BalatroOverlay] " .. tostring(message))
    end
end

--------------------------------------------------------------------------------
-- MAPPING FUNCTIONS
--------------------------------------------------------------------------------

--- Map Balatro suit to TypeScript suit type
--- @param card table Balatro card object
--- @return string
local function mapSuit(card)
    if not card or not card.base then return "spades" end

    local suit = safeGet(card, "base", "suit")
    local suitMap = {
        ["Hearts"] = "hearts",
        ["Diamonds"] = "diamonds",
        ["Clubs"] = "clubs",
        ["Spades"] = "spades"
    }
    return suitMap[suit] or "spades"
end

--- Map Balatro rank to TypeScript rank type
--- @param card table Balatro card object
--- @return string
local function mapRank(card)
    if not card or not card.base then return "2" end

    local rank = safeGet(card, "base", "value")
    local rankMap = {
        ["2"] = "2", ["3"] = "3", ["4"] = "4", ["5"] = "5",
        ["6"] = "6", ["7"] = "7", ["8"] = "8", ["9"] = "9",
        ["10"] = "10", ["Jack"] = "J", ["Queen"] = "Q",
        ["King"] = "K", ["Ace"] = "A"
    }
    return rankMap[rank] or "2"
end

--- Map enhancement type
--- @param card table Balatro card object
--- @return string
local function mapEnhancement(card)
    if not card or not card.ability then return "none" end

    local enhancement = safeGet(card, "ability", "effect")
    local enhancementMap = {
        ["Bonus Card"] = "bonus",
        ["Mult Card"] = "mult",
        ["Wild Card"] = "wild",
        ["Glass Card"] = "glass",
        ["Steel Card"] = "steel",
        ["Stone Card"] = "stone",
        ["Gold Card"] = "gold",
        ["Lucky Card"] = "lucky"
    }
    return enhancementMap[enhancement] or "none"
end

--- Map edition type
--- @param card table Balatro card object (or joker)
--- @return string
local function mapEdition(obj)
    if not obj or not obj.edition then return "none" end

    local edition = obj.edition
    if edition.foil then return "foil" end
    if edition.holo then return "holographic" end
    if edition.polychrome then return "polychrome" end
    if edition.negative then return "negative" end

    return "none"
end

--- Map seal type
--- @param card table Balatro card object
--- @return string
local function mapSeal(card)
    if not card or not card.seal then return "none" end

    local sealMap = {
        ["Gold"] = "gold",
        ["Red"] = "red",
        ["Blue"] = "blue",
        ["Purple"] = "purple"
    }
    return sealMap[card.seal] or "none"
end

--- Map game state to phase
--- @return string
local function mapGamePhase()
    if not G or not G.STATE then return "menu" end

    local state = G.STATE
    local states = G.STATES or {}

    -- Menu/title screen
    if state == states.MENU or state == states.SPLASH then
        return "menu"
    end

    -- Blind selection
    if state == states.BLIND_SELECT then
        return "blind_select"
    end

    -- Playing (hand selection, card play)
    if state == states.SELECTING_HAND or state == states.HAND_PLAYED or
       state == states.DRAW_TO_HAND or state == states.PLAY_TAROT then
        return "playing"
    end

    -- Scoring animation
    if state == states.SCORING then
        return "scoring"
    end

    -- Shop
    if state == states.SHOP or state == states.TAROT_PACK or
       state == states.PLANET_PACK or state == states.SPECTRAL_PACK or
       state == states.STANDARD_PACK or state == states.BUFFOON_PACK then
        return "shop"
    end

    -- Booster pack opening
    if state == states.TAROT_PACK or state == states.PLANET_PACK or
       state == states.SPECTRAL_PACK or state == states.STANDARD_PACK or
       state == states.BUFFOON_PACK then
        return "booster"
    end

    -- Game over
    if state == states.GAME_OVER then
        return "game_over"
    end

    -- Victory
    if state == states.ROUND_EVAL and safeGet(G, "GAME", "won") then
        return "victory"
    end

    return "playing"
end

--- Map hand type from Balatro internal name
--- @param handType string Balatro hand type
--- @return string TypeScript HandType
local function mapHandType(handType)
    if not handType then return "high_card" end

    local handMap = {
        ["High Card"] = "high_card",
        ["Pair"] = "pair",
        ["Two Pair"] = "two_pair",
        ["Three of a Kind"] = "three_of_a_kind",
        ["Straight"] = "straight",
        ["Flush"] = "flush",
        ["Full House"] = "full_house",
        ["Four of a Kind"] = "four_of_a_kind",
        ["Straight Flush"] = "straight_flush",
        ["Royal Flush"] = "royal_flush",
        ["Five of a Kind"] = "five_of_a_kind",
        ["Flush House"] = "flush_house",
        ["Flush Five"] = "flush_five"
    }
    return handMap[handType] or "high_card"
end

--- Map blind type
--- @param blind table Balatro blind object
--- @return string
local function mapBlindType(blind)
    if not blind then return "small" end

    local name = safeStr(safeGet(blind, "name"), "")
    if name:find("Boss") or blind.boss then
        return "boss"
    elseif name:find("Big") then
        return "big"
    end
    return "small"
end

--- Map joker rarity
--- @param joker table Balatro joker object
--- @return string
local function mapJokerRarity(joker)
    if not joker or not joker.config then return "common" end

    local rarity = safeGet(joker, "config", "rarity")
    local rarityMap = {
        [1] = "common",
        [2] = "uncommon",
        [3] = "rare",
        [4] = "legendary"
    }
    return rarityMap[rarity] or "common"
end

--------------------------------------------------------------------------------
-- CARD CAPTURE
--------------------------------------------------------------------------------

--- Calculate chip value for a card
--- @param card table Balatro card object
--- @return number
local function calculateCardChips(card)
    if not card then return 0 end

    -- Base chip value from rank
    local baseChips = safeGet(card, "base", "nominal") or 0

    -- Bonus from enhancement
    local ability = card.ability or {}
    local bonusChips = safeNum(ability.bonus, 0)

    return baseChips + bonusChips
end

--- Capture a single card's state
--- @param card table Balatro card object
--- @return table|nil Card state or nil
local function captureCard(card)
    if not card then return nil end

    -- Generate stable ID
    local id = safeStr(card.sort_id, tostring(card))

    return {
        id = id,
        suit = mapSuit(card),
        rank = mapRank(card),
        enhancement = mapEnhancement(card),
        edition = mapEdition(card),
        seal = mapSeal(card),
        chipValue = calculateCardChips(card)
    }
end

--- Capture cards from a CardArea
--- @param cardArea table Balatro CardArea object
--- @return table Array of captured cards
local function captureCardArea(cardArea)
    local cards = {}

    if not cardArea or not cardArea.cards then
        return cards
    end

    for _, card in ipairs(cardArea.cards) do
        local captured = captureCard(card)
        if captured then
            table.insert(cards, captured)
        end
    end

    return cards
end

--------------------------------------------------------------------------------
-- DECK STATE
--------------------------------------------------------------------------------

--- Capture complete deck state
--- @return table DeckState
local function captureDeckState()
    local deckState = {
        remaining = {},
        hand = {},
        discarded = {},
        played = {},
        totalCards = 52,
        cardsRemaining = 0
    }

    if not G then return deckState end

    -- Cards in deck (remaining to draw)
    if G.deck then
        deckState.remaining = captureCardArea(G.deck)
        deckState.cardsRemaining = #deckState.remaining
    end

    -- Cards in hand
    if G.hand then
        deckState.hand = captureCardArea(G.hand)
    end

    -- Cards in discard pile
    if G.discard then
        deckState.discarded = captureCardArea(G.discard)
    end

    -- Cards currently in play area
    if G.play then
        deckState.played = captureCardArea(G.play)
    end

    -- Calculate total cards (all areas + removed cards)
    local totalInPlay = #deckState.remaining + #deckState.hand +
                        #deckState.discarded + #deckState.played
    deckState.totalCards = math.max(totalInPlay, safeNum(safeGet(G, "GAME", "starting_deck_size"), 52))

    return deckState
end

--------------------------------------------------------------------------------
-- JOKER CAPTURE
--------------------------------------------------------------------------------

--- Check if joker is a scaling type
--- @param joker table Balatro joker object
--- @return boolean, string|nil, string|nil isScaling, scalingType, scalingKey
local function getScalingInfo(joker)
    if not joker or not joker.ability then return false, nil, nil end

    local ability = joker.ability
    local jokerId = safeStr(joker.config and joker.config.center and joker.config.center.key, "")

    -- Additive scaling jokers
    local additiveScaling = {
        ["j_green_joker"] = "extra",
        ["j_red_card"] = "extra",
        ["j_blue_joker"] = "extra",
        ["j_square_joker"] = "extra",
        ["j_runner"] = "extra",
        ["j_ice_cream"] = "extra",
        ["j_constellation"] = "extra",
        ["j_madness"] = "x_mult",
        ["j_vampire"] = "x_mult",
        ["j_obelisk"] = "x_mult"
    }

    -- Multiplicative scaling jokers
    local multScaling = {
        ["j_hologram"] = "x_mult",
        ["j_cavendish"] = "x_mult",
        ["j_steel_joker"] = "extra",
        ["j_glass_joker"] = "x_mult"
    }

    if additiveScaling[jokerId] then
        return true, "additive", additiveScaling[jokerId]
    end

    if multScaling[jokerId] then
        return true, "multiplicative", multScaling[jokerId]
    end

    -- Check for generic scaling pattern
    if ability.extra and type(ability.extra) == "number" then
        return true, "additive", "extra"
    end

    return false, nil, nil
end

--- Capture a single joker's state
--- @param joker table Balatro joker object
--- @param slotIndex number Position in joker slots (0-indexed)
--- @return table|nil JokerState or nil
local function captureJoker(joker, slotIndex)
    if not joker then return nil end

    local config = joker.config or {}
    local center = config.center or {}
    local ability = joker.ability or {}

    local isScaling, scalingType, scalingKey = getScalingInfo(joker)
    local scalingValue = nil
    if isScaling and scalingKey and ability[scalingKey] then
        scalingValue = safeNum(ability[scalingKey], 0)
    end

    -- Build effect values from ability table
    local effectValues = {}
    for k, v in pairs(ability) do
        if type(v) == "number" then
            effectValues[k] = v
        end
    end

    return {
        id = safeStr(center.key, "unknown"),
        name = safeStr(joker.label, safeStr(center.name, "Unknown Joker")),
        description = safeStr(center.text and table.concat(center.text, " "), ""),
        rarity = mapJokerRarity(joker),
        edition = mapEdition(joker),
        slotIndex = slotIndex,
        isScaling = isScaling,
        scalingValue = scalingValue,
        scalingType = scalingType,
        effectValues = effectValues,
        sellValue = safeNum(joker.sell_cost, 0)
    }
end

--- Capture all jokers
--- @return table Array of JokerState
local function captureJokers()
    local jokers = {}

    if not G or not G.jokers or not G.jokers.cards then
        return jokers
    end

    for i, joker in ipairs(G.jokers.cards) do
        local captured = captureJoker(joker, i - 1) -- 0-indexed
        if captured then
            table.insert(jokers, captured)
        end
    end

    return jokers
end

--------------------------------------------------------------------------------
-- PROGRESS STATE
--------------------------------------------------------------------------------

--- Capture progress state
--- @return table ProgressState
local function captureProgress()
    local progress = {
        ante = 1,
        round = 1,
        phase = "menu",
        handsRemaining = 4,
        discardsRemaining = 3,
        money = 4,
        runSeed = nil
    }

    if not G or not G.GAME then return progress end

    local game = G.GAME

    progress.ante = safeNum(game.round_resets and game.round_resets.ante, 1)
    progress.round = safeNum(game.round, 1)
    progress.phase = mapGamePhase()
    progress.handsRemaining = safeNum(game.current_round and game.current_round.hands_left, 4)
    progress.discardsRemaining = safeNum(game.current_round and game.current_round.discards_left, 3)
    progress.money = safeNum(game.dollars, 4)
    progress.runSeed = safeStr(game.seed, nil)

    return progress
end

--------------------------------------------------------------------------------
-- BLIND STATE
--------------------------------------------------------------------------------

--- Capture current blind state
--- @return table BlindState
local function captureBlind()
    local blindState = {
        type = "small",
        name = "Small Blind",
        chipGoal = 300,
        chipsScored = 0,
        effect = nil,
        isBoss = false
    }

    if not G or not G.GAME then return blindState end

    local game = G.GAME
    local blind = game.blind

    if blind then
        blindState.type = mapBlindType(blind)
        blindState.name = safeStr(blind.name, "Small Blind")
        blindState.isBoss = safeBool(blind.boss, false)

        -- Blind chip goal
        if blind.chips then
            blindState.chipGoal = safeNum(blind.chips, 300)
        end

        -- Boss blind effect
        if blind.boss and blind.config and blind.config.extra then
            blindState.effect = safeStr(blind.config.extra.text, nil)
        end
    end

    -- Current chips scored this round
    blindState.chipsScored = safeNum(game.chips, 0)

    return blindState
end

--------------------------------------------------------------------------------
-- HAND LEVELS
--------------------------------------------------------------------------------

--- Capture hand level upgrades
--- @return table Array of HandLevel
local function captureHandLevels()
    local handLevels = {}

    if not G or not G.GAME or not G.GAME.hands then
        return handLevels
    end

    for handName, handData in pairs(G.GAME.hands) do
        if handData and handData.visible then
            table.insert(handLevels, {
                handType = mapHandType(handName),
                level = safeNum(handData.level, 1),
                baseChips = safeNum(handData.chips, 0),
                baseMult = safeNum(handData.mult, 0)
            })
        end
    end

    return handLevels
end

--------------------------------------------------------------------------------
-- CONSUMABLES
--------------------------------------------------------------------------------

--- Capture consumables (tarots, planets, spectrals)
--- @return table ConsumableState
local function captureConsumables()
    local consumables = {
        tarots = {},
        planets = {},
        spectrals = {}
    }

    if not G or not G.consumeables or not G.consumeables.cards then
        return consumables
    end

    for _, card in ipairs(G.consumeables.cards) do
        if card and card.config and card.config.center then
            local center = card.config.center
            local cardType = safeStr(center.set, "")
            local entry = {
                id = safeStr(center.key, "unknown"),
                name = safeStr(card.label, safeStr(center.name, "Unknown"))
            }

            if cardType == "Tarot" then
                table.insert(consumables.tarots, entry)
            elseif cardType == "Planet" then
                table.insert(consumables.planets, entry)
            elseif cardType == "Spectral" then
                table.insert(consumables.spectrals, entry)
            end
        end
    end

    return consumables
end

--------------------------------------------------------------------------------
-- VOUCHERS
--------------------------------------------------------------------------------

--- Capture owned vouchers
--- @return table VoucherState
local function captureVouchers()
    local vouchers = {
        owned = {}
    }

    if not G or not G.GAME or not G.GAME.used_vouchers then
        return vouchers
    end

    for voucherId, _ in pairs(G.GAME.used_vouchers) do
        table.insert(vouchers.owned, safeStr(voucherId, "unknown"))
    end

    return vouchers
end

--------------------------------------------------------------------------------
-- SHOP STATE
--------------------------------------------------------------------------------

--- Capture shop state (only when in shop)
--- @return table|nil ShopState or nil if not in shop
local function captureShop()
    local phase = mapGamePhase()
    if phase ~= "shop" then
        return nil
    end

    local shop = {
        items = {},
        rerollCost = 5,
        rerollsUsed = 0
    }

    if not G then return shop end

    -- Reroll cost
    shop.rerollCost = safeNum(safeGet(G, "GAME", "current_round", "reroll_cost"), 5)
    shop.rerollsUsed = safeNum(safeGet(G, "GAME", "current_round", "reroll_count"), 0)

    -- Shop items from shop area
    local shopArea = G.shop_jokers
    if shopArea and shopArea.cards then
        for _, card in ipairs(shopArea.cards) do
            if card and card.config and card.config.center then
                local center = card.config.center
                table.insert(shop.items, {
                    id = safeStr(center.key, "unknown"),
                    name = safeStr(card.label, "Unknown"),
                    type = "joker",
                    cost = safeNum(card.cost, 0),
                    sold = false
                })
            end
        end
    end

    -- Shop vouchers
    local voucherArea = G.shop_vouchers
    if voucherArea and voucherArea.cards then
        for _, card in ipairs(voucherArea.cards) do
            if card and card.config and card.config.center then
                local center = card.config.center
                table.insert(shop.items, {
                    id = safeStr(center.key, "unknown"),
                    name = safeStr(card.label, "Unknown"),
                    type = "voucher",
                    cost = safeNum(card.cost, 0),
                    sold = false
                })
            end
        end
    end

    -- Shop boosters
    local boosterArea = G.shop_booster
    if boosterArea and boosterArea.cards then
        for _, card in ipairs(boosterArea.cards) do
            if card and card.config and card.config.center then
                local center = card.config.center
                table.insert(shop.items, {
                    id = safeStr(center.key, "unknown"),
                    name = safeStr(card.label, "Unknown"),
                    type = "booster",
                    cost = safeNum(card.cost, 0),
                    sold = false
                })
            end
        end
    end

    return shop
end

--------------------------------------------------------------------------------
-- HAND HISTORY
--------------------------------------------------------------------------------

--- Record a played hand to history
--- @param cards table Array of cards played
--- @param handType string Type of hand
--- @param baseScore number Base score before jokers
--- @param finalScore number Final score after jokers
function BalatroOverlay.recordPlayedHand(cards, handType, baseScore, finalScore)
    local capturedCards = {}
    for _, card in ipairs(cards or {}) do
        local captured = captureCard(card)
        if captured then
            table.insert(capturedCards, captured)
        end
    end

    local entry = {
        cards = capturedCards,
        handType = mapHandType(handType),
        baseScore = safeNum(baseScore, 0),
        finalScore = safeNum(finalScore, 0),
        timestamp = os.time()
    }

    table.insert(handHistory, 1, entry) -- Add to front

    -- Trim history
    while #handHistory > MAX_HAND_HISTORY do
        table.remove(handHistory)
    end
end

--- Get hand history
--- @return table Array of PlayedHand
local function getHandHistory()
    return handHistory
end

--- Clear hand history (on new run)
function BalatroOverlay.clearHistory()
    handHistory = {}
end

--------------------------------------------------------------------------------
-- MAIN STATE CAPTURE
--------------------------------------------------------------------------------

--- Capture complete game state
--- @return table|nil OverlayGameState or nil if game not active
function BalatroOverlay.captureGameState()
    -- Safety check - ensure G exists
    if not G then
        return nil
    end

    local state = {
        -- Metadata
        timestamp = os.time(),
        version = CONFIG.VERSION,

        -- Core state
        deck = captureDeckState(),
        jokers = captureJokers(),
        progress = captureProgress(),
        blind = captureBlind(),

        -- Secondary state
        handLevels = captureHandLevels(),
        consumables = captureConsumables(),
        vouchers = captureVouchers(),

        -- Shop (only when in shop phase)
        shop = captureShop(),

        -- Hand history
        handHistory = getHandHistory()
    }

    return state
end

--------------------------------------------------------------------------------
-- JSON ENCODING
--------------------------------------------------------------------------------

--- Convert Lua table to JSON string
--- @param tbl table Table to convert
--- @return string JSON string
function BalatroOverlay.toJSON(tbl)
    local function encode(val)
        local t = type(val)

        if t == "nil" then
            return "null"
        elseif t == "boolean" then
            return val and "true" or "false"
        elseif t == "number" then
            -- Handle special float values
            if val ~= val then -- NaN
                return "null"
            elseif val == math.huge then
                return "999999999"
            elseif val == -math.huge then
                return "-999999999"
            end
            return tostring(val)
        elseif t == "string" then
            -- Escape special characters
            local escaped = val:gsub('\\', '\\\\')
                              :gsub('"', '\\"')
                              :gsub('\n', '\\n')
                              :gsub('\r', '\\r')
                              :gsub('\t', '\\t')
            return '"' .. escaped .. '"'
        elseif t == "table" then
            -- Check if array (sequential integer keys starting from 1)
            local isArray = true
            local maxIndex = 0
            local count = 0

            for k, _ in pairs(val) do
                count = count + 1
                if type(k) == "number" and k > 0 and math.floor(k) == k then
                    maxIndex = math.max(maxIndex, k)
                else
                    isArray = false
                    break
                end
            end

            -- Empty table is an empty array
            if count == 0 then
                return "[]"
            end

            -- Check for sparse arrays
            if isArray and maxIndex ~= count then
                isArray = false
            end

            local parts = {}

            if isArray then
                for i = 1, maxIndex do
                    table.insert(parts, encode(val[i]))
                end
                return "[" .. table.concat(parts, ",") .. "]"
            else
                for k, v in pairs(val) do
                    local key = type(k) == "string" and k or tostring(k)
                    table.insert(parts, '"' .. key .. '":' .. encode(v))
                end
                return "{" .. table.concat(parts, ",") .. "}"
            end
        end

        return "null"
    end

    return encode(tbl)
end

--------------------------------------------------------------------------------
-- FILE I/O
--------------------------------------------------------------------------------

--- Ensure output directory exists
function BalatroOverlay.ensureDirectory()
    local path = CONFIG.OUTPUT_PATH:match("(.+)[/\\][^/\\]+$")
    if path then
        -- Use appropriate command for OS
        if package.config:sub(1,1) == '\\' then
            -- Windows
            os.execute('mkdir "' .. path:gsub("/", "\\") .. '" 2>nul')
        else
            -- Unix
            os.execute('mkdir -p "' .. path .. '" 2>/dev/null')
        end
    end
end

--- Write JSON to file
--- @param json string JSON string to write
function BalatroOverlay.writeFile(json)
    local file, err = io.open(CONFIG.OUTPUT_PATH, "w")
    if file then
        file:write(json)
        file:close()
    else
        log("Failed to write state file: " .. tostring(err))
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

--------------------------------------------------------------------------------
-- GAME EVENT HOOKS
--------------------------------------------------------------------------------

--- Hook for when a hand is played and scored
--- Call this from a Lovely patch after hand scoring
--- @param cards table Cards that were played
--- @param handType string Type of hand detected
--- @param baseScore number Base score
--- @param finalScore number Final score after jokers
function BalatroOverlay.onHandScored(cards, handType, baseScore, finalScore)
    BalatroOverlay.recordPlayedHand(cards, handType, baseScore, finalScore)
end

--- Hook for when a new run starts
function BalatroOverlay.onNewRun()
    BalatroOverlay.clearHistory()
    log("New run started, history cleared")
end

--------------------------------------------------------------------------------
-- INITIALIZATION
--------------------------------------------------------------------------------

--- Initialize the mod
function BalatroOverlay.init()
    -- Determine output path based on OS
    local appdata = os.getenv("APPDATA")
    if appdata then
        -- Windows
        CONFIG.OUTPUT_PATH = appdata .. "/Balatro/overlay_state.json"
    else
        -- Linux/Mac fallback
        local home = os.getenv("HOME")
        if home then
            CONFIG.OUTPUT_PATH = home .. "/.local/share/Balatro/overlay_state.json"
        else
            CONFIG.OUTPUT_PATH = "./overlay_state.json"
        end
    end

    -- Ensure output directory exists
    BalatroOverlay.ensureDirectory()

    isInitialized = true
    log("BalatroOverlay initialized, version " .. CONFIG.VERSION)
    log("Output path: " .. CONFIG.OUTPUT_PATH)
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

--- Set debug mode
--- @param enabled boolean Enable debug logging
function BalatroOverlay.setDebug(enabled)
    CONFIG.DEBUG = safeBool(enabled, false)
end

return BalatroOverlay
