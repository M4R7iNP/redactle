import cssnano from 'cssnano';
import presetEnv from 'postcss-preset-env';

export default {
    plugins: [presetEnv({ stage: 1 }), cssnano()],
};
