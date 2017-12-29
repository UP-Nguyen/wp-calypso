/**
 * @format
 * @jest-environment jsdom
 */
/**
 * External dependencies
 */
import { expect } from 'chai';
import { map } from 'lodash';

/**
 * Internal dependencies
 */
import {
	isSupportedFileTypeForSite,
	createTransientMedia,
	sortItemsByDate,
	getMimePrefix,
	getMimeType,
	isItemBeingUploaded,
	filterItemsByMimePrefix,
	isVideoPressItem,
	getThumbnailSizeDimensions,
	generateGalleryShortcode,
	getAllowedFileTypesForSite,
	canUserDeleteItem,
	getFileExtension,
	isExceedingSiteMaxUploadSize,
	playtime,
	url,
} from '../utils';

jest.mock( 'lib/impure-lodash', () => ( {
	uniqueId: () => 'media-13',
} ) );

const UNIQUEID = 'media-13';
const DUMMY_FILENAME = 'test.jpg';
const DUMMY_FILE_BLOB = {
	fileContents: {
		size: 1,
	},
	fileName: DUMMY_FILENAME,
};
const DUMMY_FILE_OBJECT = {
	thumbnails: true,
	URL: DUMMY_FILENAME,
	name: DUMMY_FILENAME,
	extension: 'jpg',
	mime_type: 'image/jpeg',
};
const EXPECTED = {
	transient: true,
	ID: UNIQUEID,
	file: DUMMY_FILENAME,
	title: 'test.jpg',
	extension: 'jpg',
	mime_type: 'image/jpeg',
};
const EXPECTED_FILE_OBJECT = {
	transient: true,
	ID: UNIQUEID,
	file: DUMMY_FILENAME,
	title: 'test.jpg',
	extension: 'jpg',
	mime_type: 'image/jpeg',
	guid: DUMMY_FILENAME,
	URL: DUMMY_FILENAME,
	external: true,
};

describe( 'MediaUtils', () => {
	describe( '#url()', () => {
		let media;

		beforeEach( () => {
			media = {
				URL: 'https://secure.gravatar.com/blavatar/4e21d703d81809d215ceaabbf07efbc6',
				thumbnails: {
					thumbnail: 'https://secure.gravatar.com/blavatar/4e21d703d81809d215ceaabbf07efbc6?s=150',
				},
			};
		} );

		test( 'should simply return the URL if media is transient', () => {
			media.transient = true;

			expect( url( media, { maxWidth: 450 } ) ).to.equal( media.URL );
		} );

		test( 'should accept a media object without options, returning the URL', () => {
			expect( url( media ) ).to.equal( media.URL );
		} );

		test( 'should accept a photon option to use the photon service', () => {
			expect( url( media, { photon: true } ) ).to.equal(
				'https://i2.wp.com/secure.gravatar.com/blavatar/4e21d703d81809d215ceaabbf07efbc6?ssl=1'
			);
		} );

		test( 'should generate the correct width-constrained photon URL', () => {
			expect( url( media, { photon: true, maxWidth: 450 } ) ).to.equal(
				'https://i2.wp.com/secure.gravatar.com/blavatar/4e21d703d81809d215ceaabbf07efbc6?ssl=1&w=450'
			);
		} );

		test( 'should generate the correct width-constrained URL', () => {
			expect( url( media, { maxWidth: 450 } ) ).to.equal(
				'https://secure.gravatar.com/blavatar/4e21d703d81809d215ceaabbf07efbc6?w=450'
			);
		} );

		test( 'should attempt to find and return a desired thumbnail size', () => {
			expect( url( media, { size: 'thumbnail' } ) ).to.equal( media.thumbnails.thumbnail );
		} );

		test( 'should gracefully handle empty media objects', () => {
			expect( url( {}, { size: 'thumbnail', maxWidth: 450 } ) ).to.be.undefined;
		} );
	} );

	describe( '#getFileExtension()', () => {
		test( 'should return undefined for a falsey media value', () => {
			expect( getFileExtension() ).to.be.undefined;
		} );

		test( 'should detect extension from file name', () => {
			expect( getFileExtension( 'example.gif' ) ).to.equal( 'gif' );
		} );

		test( 'should handle reserved url characters in filename', () => {
			expect( getFileExtension( 'example#?#?.gif' ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from HTML5 File object', () => {
			expect( getFileExtension( new window.File( [ '' ], 'example.gif' ) ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from HTML5 File object with reserved url chars', () => {
			expect( getFileExtension( new window.File( [ '' ], 'example#?#?.gif' ) ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from object file property', () => {
			expect( getFileExtension( { file: 'example.gif' } ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from already computed extension property', () => {
			expect( getFileExtension( { extension: 'gif' } ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from object URL property', () => {
			expect( getFileExtension( { URL: 'example.gif' } ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from object guid property', () => {
			expect( getFileExtension( { guid: 'example.gif' } ) ).to.equal( 'gif' );
		} );

		test( 'should detect extension from URL string with query parameters', () => {
			expect( getFileExtension( 'https://example.com/example.gif?w=110' ) ).to.equal( 'gif' );
		} );
	} );

	describe( '#getMimePrefix()', () => {
		test( "should return undefined if a mime type can't be determined", () => {
			expect( getMimePrefix() ).to.be.undefined;
		} );

		test( 'should return the mime prefix if a mime type can be determined', () => {
			expect( getMimePrefix( 'example.png' ) ).to.be.equal( 'image' );
		} );
	} );

	describe( '#getMimeType()', () => {
		test( 'should return undefined for a falsey media value', () => {
			expect( getMimeType() ).to.be.undefined;
		} );

		test( "should return undefined if detected extension doesn't exist in mime_types", () => {
			expect( getMimeType( 'file.badextension' ) ).to.be.undefined;
		} );

		test( 'should return an object mime type', () => {
			expect( getMimeType( { mime_type: 'application/fake' } ) ).to.equal( 'application/fake' );
		} );

		test( 'should detect mime type from string extension', () => {
			expect( getMimeType( 'example.gif' ) ).to.equal( 'image/gif' );
		} );

		test( 'should detect mime type with reserved url characters in filename', () => {
			expect( getMimeType( 'example#?#?.gif' ) ).to.equal( 'image/gif' );
		} );

		test( 'should ignore invalid filenames', () => {
			expect( getMimeType( 'example#?#?.gif?w=100' ) ).to.be.undefined;
		} );

		test( 'should detect mime type from HTML5 File object', () => {
			expect(
				getMimeType( new window.File( [ '' ], 'example.gif', { type: 'image/gif' } ) )
			).to.equal( 'image/gif' );
		} );

		test( 'should detect mime type from object file property', () => {
			expect( getMimeType( { file: 'example.gif' } ) ).to.equal( 'image/gif' );
		} );

		test( 'should detect mime type from object URL property', () => {
			expect( getMimeType( { URL: 'example.gif' } ) ).to.equal( 'image/gif' );
		} );

		test( 'should ignore query string parameters', () => {
			expect( getMimeType( { URL: 'example.gif?w=110' } ) ).to.equal( 'image/gif' );
		} );

		test( 'should ignore query string parameters in URL strings', () => {
			expect( getMimeType( 'https://example.com/example.gif?w=110' ) ).to.equal( 'image/gif' );
		} );

		test( 'should detect mime type from object guid property', () => {
			expect( getMimeType( { guid: 'example.gif' } ) ).to.equal( 'image/gif' );
		} );

		test( 'should detect mime type regardless of extension case', () => {
			expect( getMimeType( 'example.GIF' ) ).to.equal( 'image/gif' );
		} );
	} );

	describe( '#filterItemsByMimePrefix()', () => {
		test( 'should return an array filtered to the matching mime prefix', () => {
			const items = [ { ID: 100, mime_type: 'image/jpg' }, { ID: 200, mime_type: 'video/mp4' } ];

			expect( filterItemsByMimePrefix( items, 'image' ) ).to.eql( [ items[ 0 ] ] );
		} );

		test( 'should gracefully omit items where a mime type could not be determined', () => {
			const items = [ { ID: 100, mime_type: 'image/jpg' }, { ID: 200 }, undefined ];

			expect( filterItemsByMimePrefix( items, 'image' ) ).to.eql( [ items[ 0 ] ] );
		} );
	} );

	describe( '#sortItemsByDate()', () => {
		let items;

		beforeEach( () => {
			items = [
				{ ID: 1, date: '2015-06-19T09:36:09-04:00' },
				{ ID: 2, date: '2015-06-19T11:36:09-04:00' },
			];
		} );

		test( 'should return a new array array, sorted descending by date', () => {
			expect( map( sortItemsByDate( items ), 'ID' ) ).to.eql( [ 2, 1 ] );
		} );

		test( 'should return the item with the greater ID if the dates are not set', () => {
			items = items.map( function( item ) {
				item.date = null;
				return item;
			} );

			expect( map( sortItemsByDate( items ), 'ID' ) ).to.eql( [ 2, 1 ] );
		} );

		test( 'should return the item with the greater ID if the dates are equal', () => {
			items = items.map( function( item ) {
				item.date = '2015-06-19T09:36:09-04:00';
				return item;
			} );

			expect( map( sortItemsByDate( items ), 'ID' ) ).to.eql( [ 2, 1 ] );
		} );

		test( 'should parse dates in string format', () => {
			items = items.map( function( item ) {
				item.date = item.date.toString();
				return item;
			} );

			expect( map( sortItemsByDate( items ), 'ID' ) ).to.eql( [ 2, 1 ] );
		} );

		test( 'should not mutate the original array', () => {
			sortItemsByDate( items );
			expect( map( items, 'ID' ) ).to.eql( [ 1, 2 ] );
		} );
	} );

	describe( '#getAllowedFileTypesForSite()', () => {
		test( 'should return an empty array for a falsey site', () => {
			const extensions = getAllowedFileTypesForSite();

			expect( extensions ).to.be.an.instanceof( Array );
			expect( extensions ).to.be.empty;
		} );

		test( 'should return an array of supported file type extensions', () => {
			const extensions = getAllowedFileTypesForSite( {
				options: {
					allowed_file_types: [ 'pdf', 'gif' ],
				},
			} );

			expect( extensions ).to.be.contain( 'pdf' );
			expect( extensions ).to.be.contain( 'gif' );
		} );
	} );

	describe( '#isSupportedFileTypeForSite()', () => {
		const site = {
			options: {
				allowed_file_types: [ 'pdf', 'gif' ],
			},
		};

		test( 'should return false for a falsey item', () => {
			expect( isSupportedFileTypeForSite( null, {} ) ).to.be.false;
		} );

		test( 'should return false for a falsey site', () => {
			expect( isSupportedFileTypeForSite( {}, null ) ).to.be.false;
		} );

		test( "should return false if the site doesn't support the item's extension", () => {
			const item = { extension: 'avi' };
			const isSupported = isSupportedFileTypeForSite( item, site );

			expect( isSupported ).to.be.false;
		} );

		test( 'should return true for versions of Jetpack where option is not synced', () => {
			const isSupported = isSupportedFileTypeForSite(
				{ extension: 'exe' },
				{
					jetpack: true,
					options: {
						jetpack_version: '3.8.0',
					},
				}
			);

			expect( isSupported ).to.be.true;
		} );

		test( "should return true if the site supports the item's extension", () => {
			const item = { extension: 'pdf' };
			const isSupported = isSupportedFileTypeForSite( item, site );

			expect( isSupported ).to.be.true;
		} );

		test( 'should return true despite even if different case', () => {
			const item = { extension: 'PdF' };
			const isSupported = isSupportedFileTypeForSite( item, site );

			expect( isSupported ).to.be.true;
		} );
	} );

	describe( '#isExceedingSiteMaxUploadSize()', () => {
		const site = {
			jetpack: false,
			options: {
				max_upload_size: 1024,
			},
		};
		const jetpackSite = {
			jetpack: true,
			options: {
				jetpack_version: '4.5',
				max_upload_size: 1024,
				active_modules: [ 'videopress' ],
			},
		};

		test( 'should return null if the provided `bytes` are not numeric', () => {
			expect( isExceedingSiteMaxUploadSize( {}, site ) ).to.be.null;
		} );

		test( 'should return null if the site `options` are `undefined`', () => {
			expect( isExceedingSiteMaxUploadSize( { size: 1024 }, {} ) ).to.be.null;
		} );

		test( 'should return null if the site `max_upload_size` is `false`', () => {
			const isAcceptableSize = isExceedingSiteMaxUploadSize(
				{ size: 1024 },
				{
					options: {
						max_upload_size: false,
					},
				}
			);

			expect( isAcceptableSize ).to.be.null;
		} );

		test( 'should return null if a video is being uploaded for a Jetpack site with VideoPress enabled', () => {
			expect( isExceedingSiteMaxUploadSize( { size: 1024, mime_type: 'video/mp4' }, jetpackSite ) )
				.to.be.null;
		} );

		test( 'should not return null if a video is being uploaded for a pre-4.5 Jetpack site with VideoPress enabled', () => {
			const isAcceptableSize = isExceedingSiteMaxUploadSize(
				{ size: 1024, mime_type: 'video/mp4' },
				{
					jetpack: true,
					options: {
						jetpack_version: '3.8.1',
						max_upload_size: 1024,
						active_modules: [ 'videopress' ],
					},
				}
			);

			expect( isAcceptableSize ).to.not.be.null;
		} );

		test( 'should not return null if an image is being uploaded for a Jetpack site with VideoPress enabled', () => {
			expect( isExceedingSiteMaxUploadSize( { size: 1024, mime_type: 'image/jpeg' }, jetpackSite ) )
				.to.not.be.null;
		} );

		test( 'should not return null if a video is being uploaded for a Jetpack site with VideoPress disabled', () => {
			const isAcceptableSize = isExceedingSiteMaxUploadSize(
				{ size: 1024, mime_type: 'video/mp4' },
				{
					jetpack: true,
					options: {
						jetpack_version: '4.5',
						max_upload_size: 1024,
					},
				}
			);

			expect( isAcceptableSize ).to.not.be.null;
		} );

		test( 'should return false if the provided `bytes` are less than or equal to `max_upload_size`', () => {
			expect( isExceedingSiteMaxUploadSize( { size: 512 }, site ) ).to.be.false;
			expect( isExceedingSiteMaxUploadSize( { size: 1024 }, site ) ).to.be.false;
		} );

		test( 'should return true if the provided `bytes` are greater than `max_upload_size`', () => {
			expect( isExceedingSiteMaxUploadSize( { size: 1025 }, site ) ).to.be.true;
		} );
	} );

	describe( '#isVideoPressItem()', () => {
		test( 'should return false if passed a falsey item', () => {
			expect( isVideoPressItem() ).to.be.false;
		} );

		test( 'should return false if no `videopress_guid` property exists', () => {
			expect( isVideoPressItem( {} ) ).to.be.false;
		} );

		test( 'should return false if the `videopress_guid` property is not a valid guid', () => {
			expect( isVideoPressItem( { videopress_guid: 'bad!' } ) ).to.be.false;
		} );

		test( 'should return true if the `videopress_guid` property is a valid guid', () => {
			expect( isVideoPressItem( { videopress_guid: 'h15soamj9k9' } ) ).to.be.true;
		} );
	} );

	describe( '#playtime()', () => {
		test( 'should return undefined if not passed number', () => {
			expect( playtime() ).to.be.undefined;
		} );

		test( 'should handle specifying seconds as float value', () => {
			expect( playtime( 5.8 ) ).to.equal( '0:05' );
		} );

		test( 'should handle zero seconds', () => {
			expect( playtime( 0 ) ).to.equal( '0:00' );
		} );

		test( 'should handle single-digit seconds', () => {
			expect( playtime( 5 ) ).to.equal( '0:05' );
		} );

		test( 'should handle double-digit seconds', () => {
			expect( playtime( 55 ) ).to.equal( '0:55' );
		} );

		test( 'should handle single-digit minutes', () => {
			expect( playtime( 300 ) ).to.equal( '5:00' );
		} );

		test( 'should handle double-digit minutes', () => {
			expect( playtime( 3300 ) ).to.equal( '55:00' );
		} );

		test( 'should handle single-digit hours', () => {
			expect( playtime( 18000 ) ).to.equal( '5:00:00' );
		} );

		test( 'should handle double-digit hours', () => {
			expect( playtime( 198000 ) ).to.equal( '55:00:00' );
		} );

		test( 'should continue to increment hours for long lengths', () => {
			expect( playtime( 1998000 ) ).to.equal( '555:00:00' );
		} );
	} );

	describe( '#getThumbnailSizeDimensions()', () => {
		test( 'should return the site dimensions if exists', () => {
			const dimensions = getThumbnailSizeDimensions( 'thumbnail', {
				options: {
					image_thumbnail_width: 200,
					image_thumbnail_height: 200,
				},
			} );

			expect( dimensions ).to.eql( {
				width: 200,
				height: 200,
			} );
		} );

		test( "should return default values if site doesn't exist", () => {
			const dimensions = getThumbnailSizeDimensions( 'thumbnail' );

			expect( dimensions ).to.eql( {
				width: 150,
				height: 150,
			} );
		} );

		test( 'should return undefined values for unknown size', () => {
			const dimensions = getThumbnailSizeDimensions( null, null );

			expect( dimensions ).to.eql( {
				width: undefined,
				height: undefined,
			} );
		} );
	} );

	describe( '#generateGalleryShortcode()', () => {
		test( 'should generate a gallery shortcode', () => {
			const value = generateGalleryShortcode( { items: [ { ID: 100 }, { ID: 200 } ] } );

			expect( value ).to.equal( '[gallery ids="100,200"]' );
		} );

		test( 'should accept an optional set of parameters', () => {
			const value = generateGalleryShortcode( {
				items: [ { ID: 100 }, { ID: 200 } ],
				type: 'square',
				columns: 2,
			} );

			expect( value ).to.equal( '[gallery ids="100,200" type="square" columns="2"]' );
		} );

		test( 'should omit size and columns attributes if not used', () => {
			const value = generateGalleryShortcode( {
				items: [ { ID: 100 }, { ID: 200 } ],
				type: 'rectangular',
				columns: 2,
			} );

			expect( value ).to.equal( '[gallery ids="100,200" type="rectangular"]' );
		} );
	} );

	describe( '#canUserDeleteItem()', () => {
		const item = { author_ID: 73705554 };

		test( 'should return false if the user ID matches the item author but user cannot delete posts', () => {
			const user = { ID: 73705554 };
			const site = {
				capabilities: {
					delete_posts: false,
				},
			};

			expect( canUserDeleteItem( item, user, site ) ).to.be.false;
		} );

		test( 'should return true if the user ID matches the item author and user can delete posts', () => {
			const user = { ID: 73705554 };
			const site = {
				capabilities: {
					delete_posts: true,
				},
			};

			expect( canUserDeleteItem( item, user, site ) ).to.be.true;
		} );

		test( 'should return false if the user ID does not match the item author and user cannot delete others posts', () => {
			const user = { ID: 73705672 };
			const site = {
				capabilities: {
					delete_others_posts: false,
				},
			};

			expect( canUserDeleteItem( item, user, site ) ).to.be.false;
		} );

		test( 'should return true if the user ID does not match the item author but user can delete others posts', () => {
			const user = { ID: 73705672 };
			const site = {
				capabilities: {
					delete_others_posts: true,
				},
			};

			expect( canUserDeleteItem( item, user, site ) ).to.be.true;
		} );
	} );

	describe( '#isItemBeingUploaded()', () => {
		test( 'should return null if item was not specified', () => {
			expect( isItemBeingUploaded() ).to.be.null;
		} );

		test( 'should return true if the item is currently being uploaded', () => {
			const item = { transient: true };

			expect( isItemBeingUploaded( item ) ).to.be.true;
		} );

		test( 'should return false if the item is not being uploaded', () => {
			const item = {};

			expect( isItemBeingUploaded( item ) ).to.be.false;
		} );
	} );

	describe( '#createTransientMedia()', () => {
		const GUID = 'URL';

		beforeEach( () => {
			window.URL = {
				createObjectURL: () => {
					return GUID;
				},
			};
		} );

		test( 'should return a transient for a file blob', () => {
			const actual = createTransientMedia( DUMMY_FILE_BLOB );
			const expected = Object.assign( {}, EXPECTED, {
				URL: GUID,
				guid: GUID,
				size: 1,
			} );

			expect( actual ).to.eql( expected );
		} );

		test( 'should return a transient for a filename', () => {
			const actual = createTransientMedia( DUMMY_FILENAME );

			expect( actual ).to.eql( EXPECTED );
		} );

		test( 'should return a transient for a file object', () => {
			const actual = createTransientMedia( DUMMY_FILE_OBJECT );

			expect( actual ).to.eql( EXPECTED_FILE_OBJECT );
		} );
	} );
} );
