import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_DB;

        if (!mongoURI) {
            throw new Error('MONGO_DB environment variable is not defined');
        }

        await mongoose.connect(mongoURI);
        console.log('Polaczono z MongoDB');

    } catch (error) {
        console.error('Blad polaczenia z MongoDB', error);
        process.exit(1);
    }
};