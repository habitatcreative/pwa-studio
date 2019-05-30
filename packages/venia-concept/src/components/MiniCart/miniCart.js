import React from 'react';
import { bool, func, shape, string } from 'prop-types';

import { useWindowSize } from '@magento/peregrine';

import Body from './body';
import Footer from './footer';
import Header from './header';

import { mergeClasses } from 'src/classify';
import defaultClasses from './miniCart.css';

const MiniCart = props => {
    // Props.
    const {
        beginEditItem,
        cart,
        closeDrawer,
        endEditItem,
        isCartEmpty,
        isMiniCartMaskOpen,
        isOpen,
        removeItemFromCart,
        updateItemInCart
    } = props;

    // Hooks.
    const { innerHeight: viewportHeight } = useWindowSize();

    // Members.
    const classes = mergeClasses(defaultClasses, props.classes);
    const rootClass = isOpen ? classes.root_open : classes.root;
    const rootStyle = {
        '--minicart-height-unit': `${viewportHeight * 0.01}px`
    };

    return (
        <aside className={rootClass} style={rootStyle}>
            <Header
                closeDrawer={closeDrawer}
                isEditingItem={cart.isEditingItem}
            />
            <Body
                beginEditItem={beginEditItem}
                cart={cart}
                closeDrawer={closeDrawer}
                endEditItem={endEditItem}
                isCartEmpty={isCartEmpty}
                isMiniCartMaskOpen={isMiniCartMaskOpen}
                removeItemFromCart={removeItemFromCart}
                updateItemInCart={updateItemInCart}
            />
            <Footer
                cart={cart}
                isCartEmpty={isCartEmpty}
                isMiniCartMaskOpen={isMiniCartMaskOpen}
            />
        </aside>
    );
};

MiniCart.propTypes = {
    beginEditItem: func.isRequired,
    cart: shape({
        isEditingItem: bool
    }).isRequired,
    classes: shape({
        header: string,
        root: string,
        root_open: string,
        title: string
    }),
    closeDrawer: func,
    endEditItem: func.isRequired,
    isCartEmpty: bool,
    isMiniCartMaskOpen: bool,
    isOpen: bool,
    removeItemFromCart: func,
    updateItemInCart: func
};

export default MiniCart;
