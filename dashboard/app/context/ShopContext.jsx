"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const ShopContext = createContext();

export function ShopProvider({ children }) {
    const [shop, setShopState] = useState("demo-store.myshopify.com");

    useEffect(() => {
        const stored = localStorage.getItem("ss_shop");
        if (stored) setShopState(stored);
    }, []);

    const setShop = (newShop) => {
        setShopState(newShop);
        localStorage.setItem("ss_shop", newShop);
    };

    return (
        <ShopContext.Provider value={{ shop, setShop }}>
            {children}
        </ShopContext.Provider>
    );
}

export function useShop() {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error("useShop must be used within a ShopProvider");
    }
    return context;
}
