use anchor_lang::prelude::*;

/// Customer Utility Score Model (Section 2.5):
/// utility(stall) = -price + (brand_tolerance * price) + traffic_bonus(plot_tier) + reputation_bonus + vrf_noise
pub fn calculate_customer_utility(
    price_cents: u16,
    has_brand: bool,
    tier_traffic_mult: u16, // scaled x 100
    reputation: u8,
    vrf_noise: i16,
) -> i64 {
    let base_price_neg = -(price_cents as i64);
    
    // Brand adds 10% tolerance (reduces perceived price drag by 10%)
    let brand_bonus = if has_brand {
        (price_cents as i64 * 10) / 100
    } else {
        0
    };

    // Traffic bonus from tier (e.g., 200 for Corner = 2.0x)
    let traffic_bonus = (tier_traffic_mult as i64 * 2) - 200;

    // Reputation bonus: 0..100 -> 0..50 utility points
    let rep_bonus = (reputation as i64) / 2;

    base_price_neg + brand_bonus + traffic_bonus + rep_bonus + (vrf_noise as i64)
}

/// Calculate Player Net Worth (Section 1.3):
/// net_worth = cash + sum(property_value) + sum(business_value) + inventory_value - debt
pub fn calculate_net_worth(
    cash_gd: u64,
    property_values: u64,
    business_values: u64,
    inventory_value: u64,
    outstanding_debt: u64,
) -> i64 {
    let assets = cash_gd as i128
        + property_values as i128
        + business_values as i128
        + inventory_value as i128;
    
    let net = assets - (outstanding_debt as i128);
    net as i64
}
