--- STEAMODDED HEADER
--- MOD_NAME: Balatro Overlay Bridge
--- MOD_ID: BalatroOverlayBridge
--- MOD_AUTHOR: [Author]
--- MOD_DESCRIPTION: Exports game state for external overlay

----------------------------------------------
-- Configuration
----------------------------------------------

local EXPORT_INTERVAL = 0.1  -- 100ms minimum between exports
local DEBUG = false

----------------------------------------------
-- State tracking
----------------------------------------------

local last_export = 0
local output_path = nil

----------------------------------------------
-- Initialization
----------------------------------------------

local function init()
    -- Determine output path based on OS
    local appdata = os.getenv("APPDATA")
    if appdata then
        -- Windows
        output_path = appdata .. "/Balatro/overlay_state.json"
    else
        -- Linux/Mac fallback
        local home = os.getenv("HOME")
        output_path = home .. "/.local/share/Balatro/overlay_state.json"
    end

    if DEBUG then
        print("[BalatroOverlay] Initialized, output: " .. output_path)
    end
end

----------------------------------------------
-- Utility functions
----------------------------------------------

local function get_ante()
    if G and G.GAME and G.GAME.round_resets then
        return G.GAME.round_resets.ante or 1
    end
    return 1
end

local function get_round()
    if G and G.GAME then
        return G.GAME.round or 1
    end
    return 1
end

local function get_phase()
    if not G or not G.STATE then
        return "menu"
    end

    -- Map game states to our phase names
    local state = G.STATE
    if state == G.STATES.MENU then return "menu" end
    if state == G.STATES.BLIND_SELECT then return "blind_select" end
    if state == G.STATES.SELECTING_HAND then return "playing" end
    if state == G.STATES.HAND_PLAYED then return "scoring" end
    if state == G.STATES.DRAW_TO_HAND then return "playing" end
    if state == G.STATES.SHOP then return "shop" end
    if state == G.STATES.TAROT_PACK or state == G.STATES.PLANET_PACK or state == G.STATES.SPECTRAL_PACK then
        return "booster"
    end
    if state == G.STATES.GAME_OVER then return "game_over" end

    return "playing"
end

local function get_suit_name(suit)
    if suit == "Hearts" then return "hearts" end
    if suit == "Diamonds" then return "diamonds" end
    if suit == "Clubs" then return "clubs" end
    if suit == "Spades" then return "spades" end
    return "unknown"
end

local function get_rank_name(value)
    if value == "Ace" then return "A" end
    if value == "King" then return "K" end
    if value == "Queen" then return "Q" end
    if value == "Jack" then return "J" end
    return value  -- Numbers stay as-is
end

local function serialize_card(card)
    if not card or not card.base then
        return nil
    end

    local enhancement = "none"
    if card.ability then
        if card.ability.name == "Bonus Card" then enhancement = "bonus"
        elseif card.ability.name == "Mult Card" then enhancement = "mult"
        elseif card.ability.name == "Wild Card" then enhancement = "wild"
        elseif card.ability.name == "Glass Card" then enhancement = "glass"
        elseif card.ability.name == "Steel Card" then enhancement = "steel"
        elseif card.ability.name == "Stone Card" then enhancement = "stone"
        elseif card.ability.name == "Gold Card" then enhancement = "gold"
        elseif card.ability.name == "Lucky Card" then enhancement = "lucky"
        end
    end

    local edition = "none"
    if card.edition then
        if card.edition.foil then edition = "foil"
        elseif card.edition.holo then edition = "holographic"
        elseif card.edition.polychrome then edition = "polychrome"
        elseif card.edition.negative then edition = "negative"
        end
    end

    local seal = "none"
    if card.seal then
        seal = string.lower(card.seal)
    end

    return {
        id = tostring(card.unique_val or card.sort_id or 0),
        suit = get_suit_name(card.base.suit),
        rank = get_rank_name(card.base.value),
        enhancement = enhancement,
        edition = edition,
        seal = seal,
        chipValue = card.base.nominal or 0,
        highlighted = card.highlighted or false
    }
end

local function serialize_cards(card_area)
    local cards = {}
    if card_area and card_area.cards then
        for _, card in ipairs(card_area.cards) do
            if card then
                local serialized = serialize_card(card)
                if serialized then
                    table.insert(cards, serialized)
                end
            end
        end
    end
    return cards
end

local function serialize_joker(joker)
    if not joker or not joker.ability then
        return nil
    end

    local rarity = "common"
    if joker.config and joker.config.center and joker.config.center.rarity then
        local r = joker.config.center.rarity
        if r == 2 then rarity = "uncommon"
        elseif r == 3 then rarity = "rare"
        elseif r == 4 then rarity = "legendary"
        end
    end

    local edition = "none"
    if joker.edition then
        if joker.edition.foil then edition = "foil"
        elseif joker.edition.holo then edition = "holographic"
        elseif joker.edition.polychrome then edition = "polychrome"
        elseif joker.edition.negative then edition = "negative"
        end
    end

    return {
        id = joker.config and joker.config.center and joker.config.center.key or "unknown",
        name = joker.ability.name or "Unknown",
        description = "",  -- Would need localization lookup
        rarity = rarity,
        edition = edition,
        slotIndex = joker.ability.order or 0,
        isScaling = false,  -- TODO: detect scaling jokers
        effectValues = {},
        sellValue = joker.sell_cost or 0
    }
end

local function serialize_jokers()
    local jokers = {}
    if G and G.jokers and G.jokers.cards then
        for _, joker in ipairs(G.jokers.cards) do
            local serialized = serialize_joker(joker)
            if serialized then
                table.insert(jokers, serialized)
            end
        end
    end
    return jokers
end

local function get_hand_levels()
    local levels = {}
    if not G or not G.GAME or not G.GAME.hands then
        return levels
    end

    local hand_mapping = {
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

    for hand_name, hand_data in pairs(G.GAME.hands) do
        local hand_type = hand_mapping[hand_name]
        if hand_type and hand_data then
            table.insert(levels, {
                handType = hand_type,
                level = hand_data.level or 1,
                baseChips = hand_data.chips or 0,
                baseMult = hand_data.mult or 0
            })
        end
    end

    return levels
end

local function get_blind_info()
    if not G or not G.GAME then
        return {
            type = "small",
            name = "Small Blind",
            chipGoal = 300,
            chipsScored = 0,
            isBoss = false
        }
    end

    local blind_type = "small"
    local round = G.GAME.round or 1
    if round == 1 then blind_type = "small"
    elseif round == 2 then blind_type = "big"
    else blind_type = "boss"
    end

    local blind = G.GAME.blind or {}
    return {
        type = blind_type,
        name = blind.name or "Unknown",
        chipGoal = blind.chips or 300,
        chipsScored = G.GAME.chips or 0,
        effect = blind.config and blind.config.blind and blind.config.blind.debuff_text or nil,
        isBoss = blind_type == "boss"
    }
end

----------------------------------------------
-- JSON encoding (simple implementation)
----------------------------------------------

local function encode_value(val)
    local t = type(val)

    if t == "nil" then
        return "null"
    elseif t == "boolean" then
        return val and "true" or "false"
    elseif t == "number" then
        return tostring(val)
    elseif t == "string" then
        return '"' .. val:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t') .. '"'
    elseif t == "table" then
        -- Check if array (sequential numeric keys starting from 1)
        local is_array = true
        local max_index = 0
        for k, _ in pairs(val) do
            if type(k) ~= "number" or k < 1 or math.floor(k) ~= k then
                is_array = false
                break
            end
            if k > max_index then max_index = k end
        end
        -- Also check if it's sparse
        if is_array and max_index ~= #val then
            is_array = #val > 0  -- Only treat as array if has sequential elements
        end

        local parts = {}
        if is_array and #val > 0 then
            for i = 1, #val do
                table.insert(parts, encode_value(val[i]))
            end
            return "[" .. table.concat(parts, ",") .. "]"
        elseif next(val) == nil then
            -- Empty table - default to empty array
            return "[]"
        else
            for k, v in pairs(val) do
                table.insert(parts, '"' .. tostring(k) .. '":' .. encode_value(v))
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end
    end

    return "null"
end

----------------------------------------------
-- Main export function
----------------------------------------------

local function export_state()
    local now = love.timer.getTime()
    if now - last_export < EXPORT_INTERVAL then
        return  -- Too soon, skip
    end
    last_export = now

    if not output_path then
        init()
    end

    -- Build game state
    local state = {
        timestamp = os.time() * 1000,
        version = "0.1.0",
        deck = {
            remaining = serialize_cards(G and G.deck),
            hand = serialize_cards(G and G.hand),
            discarded = serialize_cards(G and G.discard),
            played = serialize_cards(G and G.play),
            totalCards = 52,
            cardsRemaining = G and G.deck and G.deck.cards and #G.deck.cards or 0
        },
        jokers = serialize_jokers(),
        progress = {
            ante = get_ante(),
            round = get_round(),
            phase = get_phase(),
            handsRemaining = G and G.GAME and G.GAME.current_round and G.GAME.current_round.hands_left or 0,
            discardsRemaining = G and G.GAME and G.GAME.current_round and G.GAME.current_round.discards_left or 0,
            money = G and G.GAME and G.GAME.dollars or 0
        },
        blind = get_blind_info(),
        handLevels = get_hand_levels(),
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

    -- Write to file
    local json = encode_value(state)
    local file = io.open(output_path, "w")
    if file then
        file:write(json)
        file:close()
    end
end

----------------------------------------------
-- Hook into game events
----------------------------------------------

-- Initialize on load
init()

-- Hook into game update loop
local orig_update = love.update
love.update = function(dt)
    if orig_update then
        orig_update(dt)
    end
    export_state()
end

if DEBUG then
    print("[BalatroOverlay] Mod loaded successfully")
end
