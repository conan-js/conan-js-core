import {IConsumer, IKeyValuePairs, IProducer, IVarArgConstructor} from "./typesHelper";


export interface AnnotationsMetadataBySpaceAndPrototypeHolder<T> {
    $a: AnnotationsMetadataBySpaceAndPrototype<T>;
}

export type AnnotationsMetadataBySpaceAndPrototype<T>  = IKeyValuePairs<AnnotationsMetadataByPrototype<T>>;
export type AnnotationsMetadataByPrototype<T>  = IKeyValuePairs<T>;


export class MetadataCrudUtils <T> {
    constructor (
        private readonly spaceName: string,
        private readonly defaultProvider: IProducer<T>

    ) {}

    updateMetadata(constructor: IVarArgConstructor<any>, updater: IConsumer<T>): T {
        let current: T | null = this.getOrCreateMetadata(constructor);
        if (current == null) throw Error (`can't get or create metaData`);
        updater(current);
        return current;
    }

    assignMetaDataToConstructor(constructor: any, metaData: T) {
        let annotationsMetadataBySpaceAndPrototypeHolder: AnnotationsMetadataBySpaceAndPrototypeHolder<T> = this.getPrototype(constructor);

        if (annotationsMetadataBySpaceAndPrototypeHolder.$a == null) {
            annotationsMetadataBySpaceAndPrototypeHolder.$a = {};
        }

        if (annotationsMetadataBySpaceAndPrototypeHolder.$a[this.spaceName] == null) {
            annotationsMetadataBySpaceAndPrototypeHolder.$a[this.spaceName] = {};
        }

        let name = MetadataCrudUtils.extractName(constructor);
        annotationsMetadataBySpaceAndPrototypeHolder.$a[this.spaceName][name] = metaData;
    }

    getAnnotationsMetaData(constructorOrInstance: any): T | null {
        let annotationsMetadataBySpaceAndPrototypeHolder: AnnotationsMetadataBySpaceAndPrototypeHolder<T> = constructorOrInstance;
        if (!annotationsMetadataBySpaceAndPrototypeHolder.$a) {
            annotationsMetadataBySpaceAndPrototypeHolder = this.getPrototype(constructorOrInstance);
        }


        let annotationsMetadataBySpaceAndPrototype = annotationsMetadataBySpaceAndPrototypeHolder.$a;
        if (annotationsMetadataBySpaceAndPrototype == null) {
            return null;
        }

        let annotationsMetadataByPrototype = annotationsMetadataBySpaceAndPrototype [this.spaceName];
        if (annotationsMetadataByPrototype == null) {
            return null;
        }

        let name = MetadataCrudUtils.extractName(constructorOrInstance);
        return annotationsMetadataByPrototype[name];
    }

    getOrCreateMetadata(constructor: any): T | null {
        if (this.getAnnotationsMetaData(constructor) == null) {
            let metadata: T = this.defaultProvider();
            this.assignMetaDataToConstructor(constructor, metadata);
        }
        return this.getAnnotationsMetaData(constructor);
    }

    getPrototype (constructor: any): AnnotationsMetadataBySpaceAndPrototypeHolder<T> {
        if (typeof constructor === 'object') {
            return constructor;
        }

        if (typeof constructor.prototype === 'object') {
            return constructor.prototype;
        }

        return this.getPrototype(Object.getPrototypeOf(constructor));
    }

    static extractName<T, D>(constructor: IVarArgConstructor<any>): string {
        let rawName = (<any>constructor).name;
        if (rawName == null) {
            rawName = (<any>constructor.constructor).name;
        }
        return rawName.substring(0, 1).toLowerCase() + rawName.substring(1, rawName.length);
    }


}
