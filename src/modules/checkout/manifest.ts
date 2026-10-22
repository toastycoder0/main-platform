import type { ModuleManifest } from '../manifest';
import { CHECKOUT_STEP_LABELS, CHECKOUT_STEP_PATHS } from './application/checkout.constants';

export const checkoutManifest: ModuleManifest = {
  name: 'checkout',
  contributions: {
    public: {
      nav: [],
      routeLabels: {
        [CHECKOUT_STEP_PATHS.billing]: CHECKOUT_STEP_LABELS.billing,
        [CHECKOUT_STEP_PATHS.delivery]: CHECKOUT_STEP_LABELS.delivery,
        [CHECKOUT_STEP_PATHS.review]: CHECKOUT_STEP_LABELS.review,
      },
    },
  },
};
